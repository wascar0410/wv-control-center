#!/bin/bash

# SSL Certificate Verification Script
# Verifies that HTTPS certificates are valid for custom domains
# Usage: ./scripts/verify-ssl.sh

set -e

echo "=================================================="
echo "SSL Certificate Verification for WV Control Center"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Domains to verify
DOMAINS=("app.wvtransports.com" "api.wvtransports.com")

# Function to check certificate
check_certificate() {
    local domain=$1
    echo "Checking certificate for: $domain"
    echo "---"
    
    # Get certificate info
    local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
    
    if [ -z "$cert_info" ]; then
        echo -e "${RED}✗ Failed to retrieve certificate${NC}"
        return 1
    fi
    
    # Extract certificate details
    local subject=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null)
    local issuer=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null)
    local dates=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    local san=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" || echo "No SAN found")
    
    echo "Subject: $subject"
    echo "Issuer: $issuer"
    echo "$dates"
    echo ""
    echo "SAN (Subject Alternative Names):"
    echo "$san"
    echo ""
    
    # Check if certificate is valid for the domain
    if echo "$subject" | grep -q "$domain"; then
        echo -e "${GREEN}✓ Certificate CN matches domain${NC}"
        return 0
    elif echo "$san" | grep -q "$domain"; then
        echo -e "${GREEN}✓ Certificate SAN includes domain${NC}"
        return 0
    else
        echo -e "${RED}✗ Certificate does NOT match domain${NC}"
        echo "   Expected CN or SAN: $domain"
        echo "   Certificate CN: $(echo "$subject" | grep -oP 'CN\s*=\s*\K[^,]*' || echo 'Not found')"
        return 1
    fi
}

# Function to check HTTPS connectivity
check_https() {
    local domain=$1
    echo "Checking HTTPS connectivity for: $domain"
    echo "---"
    
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$domain" 2>/dev/null || echo "000")
    
    if [ "$http_code" != "000" ]; then
        echo -e "${GREEN}✓ HTTPS is responding (HTTP $http_code)${NC}"
        return 0
    else
        echo -e "${RED}✗ HTTPS is not responding${NC}"
        return 1
    fi
}

# Main verification loop
echo "1. CERTIFICATE VALIDATION"
echo "=========================="
echo ""

all_valid=true

for domain in "${DOMAINS[@]}"; do
    if ! check_certificate "$domain"; then
        all_valid=false
    fi
    echo ""
done

echo "2. HTTPS CONNECTIVITY TEST"
echo "=========================="
echo ""

for domain in "${DOMAINS[@]}"; do
    if ! check_https "$domain"; then
        all_valid=false
    fi
    echo ""
done

echo "3. SUMMARY"
echo "=========="
echo ""

if [ "$all_valid" = true ]; then
    echo -e "${GREEN}✓ All SSL certificates are valid and HTTPS is working correctly${NC}"
    echo ""
    echo "Configuration is ready for production:"
    echo "  ALLOWED_HOSTS=localhost,127.0.0.1,app.wvtransports.com,api.wvtransports.com"
    echo "  CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://app.wvtransports.com,https://api.wvtransports.com"
    exit 0
else
    echo -e "${RED}✗ Some SSL certificates are not valid or HTTPS is not working${NC}"
    echo ""
    echo -e "${YELLOW}Action required:${NC}"
    echo "1. Contact Manus Platform support at help.manus.im"
    echo "2. Request Let's Encrypt certificates for:"
    for domain in "${DOMAINS[@]}"; do
        echo "   - $domain"
    done
    echo "3. Ensure DNS (CNAME) is configured correctly"
    echo "4. Wait for certificate provisioning to complete"
    echo "5. Run this script again to verify"
    exit 1
fi
