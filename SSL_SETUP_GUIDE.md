# SSL Certificate Setup Guide

## Current Status

**Domains:** app.wvtransports.com, api.wvtransports.com  
**DNS:** ✅ Configured and propagated  
**HTTPS:** ⏳ Waiting for Let's Encrypt certificate provisioning  
**Current Certificate:** ❌ Invalid (*.manusvm.computer - does not match custom domains)

---

## What's Happening

You've submitted a support request to Manus Platform to provision Let's Encrypt certificates for your custom domains. This is the correct approach because:

1. **Automatic provisioning** is handled by Manus Platform
2. **Let's Encrypt** provides free, valid certificates
3. **DNS validation** is already possible (your CNAME is configured)
4. **Auto-renewal** will be handled automatically every 90 days

---

## Timeline

| Step | Status | Details |
|------|--------|---------|
| DNS Configuration | ✅ Complete | CNAME records are propagated |
| Support Request | ✅ Submitted | Manus Platform has your request |
| Certificate Provisioning | ⏳ In Progress | Waiting for Manus Platform to issue certs |
| HTTPS Validation | ⏳ Pending | Will verify once certs are active |
| Production Ready | ⏳ Waiting | Ready to deploy once HTTPS is confirmed |

---

## Application Configuration

Your application is **already configured** for the custom domains:

### ALLOWED_HOSTS (Host Header Validation)
```
localhost,127.0.0.1,app.wvtransports.com,api.wvtransports.com
```

### CORS_ORIGINS (Cross-Origin Resource Sharing)
```
http://localhost:3000,http://localhost:5173,https://app.wvtransports.com,https://api.wvtransports.com
```

These values are in `.env.production.example` and ready to be used once Manus Platform provisions the certificates.

---

## Verification Script

Once Manus Platform provisions the certificates, use this script to verify everything is working:

```bash
./scripts/verify-ssl.sh
```

This script will:
1. ✅ Check certificate validity for both domains
2. ✅ Verify certificate CN/SAN matches the domain
3. ✅ Test HTTPS connectivity
4. ✅ Confirm the certificate is NOT the wildcard manusvm.computer
5. ✅ Report if configuration is production-ready

---

## Expected Output (When Certificates Are Ready)

```
==================================================
SSL Certificate Verification for WV Control Center
==================================================

1. CERTIFICATE VALIDATION
==========================

Checking certificate for: app.wvtransports.com
---
Subject: CN = app.wvtransports.com
Issuer: C = US, O = Let's Encrypt, CN = R3
notBefore=Mar 29 00:00:00 2026 GMT
notAfter=Jun 27 23:59:59 2026 GMT

✓ Certificate CN matches domain

2. HTTPS CONNECTIVITY TEST
==========================

Checking HTTPS connectivity for: app.wvtransports.com
---
✓ HTTPS is responding (HTTP 200)

3. SUMMARY
==========

✓ All SSL certificates are valid and HTTPS is working correctly

Configuration is ready for production:
  ALLOWED_HOSTS=localhost,127.0.0.1,app.wvtransports.com,api.wvtransports.com
  CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://app.wvtransports.com,https://api.wvtransports.com
```

---

## Troubleshooting

### Issue: "ERR_CERT_COMMON_NAME_INVALID"

**Cause:** Certificate is still for `*.manusvm.computer`

**Solution:**
1. Wait for Manus Platform to provision new certificates
2. Run `./scripts/verify-ssl.sh` to check status
3. If still not ready, contact Manus Platform support

### Issue: "Certificate has expired"

**Cause:** Old certificate is still in use

**Solution:**
1. Clear browser cache
2. Wait 24 hours for DNS propagation
3. Try in incognito/private mode
4. Contact Manus Platform if issue persists

### Issue: "Connection refused" or "Timeout"

**Cause:** Application not responding on HTTPS

**Solution:**
1. Verify application is running: `curl -k https://app.wvtransports.com`
2. Check server logs for errors
3. Verify DNS is pointing to correct IP: `nslookup app.wvtransports.com`

---

## Next Steps

### When Manus Platform Confirms Certificates Are Ready

1. **Run verification script:**
   ```bash
   ./scripts/verify-ssl.sh
   ```

2. **Test in browser:**
   - Navigate to https://app.wvtransports.com
   - Verify no certificate warnings
   - Check certificate details (should show Let's Encrypt)

3. **Test API endpoint:**
   ```bash
   curl -v https://api.wvtransports.com/api/trpc/auth.me
   ```

4. **Verify CORS:**
   - Open browser DevTools
   - Check Network tab for CORS headers
   - Should see: `Access-Control-Allow-Origin: https://app.wvtransports.com`

### Configuration in Production

Once certificates are confirmed valid:

1. **Set environment variables in Manus Platform:**
   ```
   ALLOWED_HOSTS=localhost,127.0.0.1,app.wvtransports.com,api.wvtransports.com
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://app.wvtransports.com,https://api.wvtransports.com
   ```

2. **Restart application** to apply changes

3. **Monitor security alerts** - Rate limiting and host monitoring are active

---

## Support

If Manus Platform doesn't provision certificates within 24-48 hours:

**Contact:** https://help.manus.im

**Include in your message:**
- Project name: WV Control Center
- Domains: app.wvtransports.com, api.wvtransports.com
- Current issue: Certificate still shows *.manusvm.computer
- DNS status: Configured and propagated

---

## Reference

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [ACME DNS Validation](https://tools.ietf.org/html/rfc8555#section-8.4)
- [CORS Configuration](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Host Header Validation](https://owasp.org/www-community/attacks/Host_Header_Injection)
