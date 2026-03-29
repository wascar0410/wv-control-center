# Security Configuration Guide

## Overview

WV Control Center includes comprehensive security features for production environments:

1. **Host Validation** - Restrict requests to authorized domains
2. **CORS Configuration** - Control cross-origin requests
3. **Rate Limiting** - Prevent abuse and DDoS attacks
4. **Host Monitoring** - Track and alert on suspicious activity
5. **Security Monitoring Dashboard** - Admin access to security metrics

---

## 1. Environment Variables Configuration

### Production Setup

Copy `.env.production.example` to your hosting platform and configure:

```bash
# Host Validation & CORS
ALLOWED_HOSTS=app.wvtransports.com,api.wvtransports.com,www.wvtransports.com
CORS_ORIGINS=https://app.wvtransports.com,https://api.wvtransports.com,https://www.wvtransports.com

# Rate Limiting
RATE_LIMITING_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000         # Per window
RATE_LIMIT_SUSPICIOUS_MAX_REQUESTS=100

# Host Rejection Monitoring
HOST_REJECTION_MONITORING_ENABLED=true
HOST_REJECTION_ALERT_THRESHOLD=10    # Rejections before alert
HOST_REJECTION_ALERT_WINDOW_MS=3600000  # 1 hour
AUTO_BLOCK_SUSPICIOUS_HOSTS=true
SUSPICIOUS_HOST_BLOCK_DURATION_MS=86400000  # 24 hours

# Notifications
SECURITY_NOTIFICATIONS_ENABLED=true
SECURITY_NOTIFICATION_LEVEL=warning  # critical, warning, info
```

### Hosting Platform Setup

**Manus Platform:**
1. Go to Settings → Secrets
2. Add each environment variable from `.env.production.example`
3. Restart the dev server to apply changes

**External Hosting (Railway, Render, etc.):**
1. Create `.env.production` file with your values
2. Add to your deployment configuration
3. Ensure variables are set before deployment

---

## 2. Host Validation

### How It Works

- **Development**: All hosts allowed (permissive for testing)
- **Production**: Only configured hosts accepted (restrictive)

### Default Allowed Hosts

```
localhost
127.0.0.1
app.wvtransports.com
api.wvtransports.com
```

### Adding Custom Hosts

Set `ALLOWED_HOSTS` environment variable:

```bash
ALLOWED_HOSTS=app.wvtransports.com,api.wvtransports.com,staging.wvtransports.com
```

### Testing Host Validation

```bash
# Valid host - returns 200
curl -H "Host: app.wvtransports.com" https://your-app.com/api/trpc/auth.me

# Invalid host - returns 400 in production
curl -H "Host: attacker.example.com" https://your-app.com/api/trpc/auth.me
```

---

## 3. CORS Configuration

### Default Allowed Origins

```
http://localhost:3000
http://localhost:5173
https://app.wvtransports.com
https://api.wvtransports.com
```

### Adding Custom Origins

Set `CORS_ORIGINS` environment variable:

```bash
CORS_ORIGINS=https://app.wvtransports.com,https://staging.wvtransports.com
```

### CORS Headers

The server automatically sets:

```
Access-Control-Allow-Origin: [matching-origin]
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Cookie
```

---

## 4. Rate Limiting

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `RATE_LIMITING_ENABLED` | `true` | Enable/disable rate limiting |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Time window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `1000` | Max requests per window |
| `RATE_LIMIT_SUSPICIOUS_MAX_REQUESTS` | `100` | Max for suspicious hosts |
| `AUTO_BLOCK_SUSPICIOUS_HOSTS` | `true` | Auto-block after threshold |
| `SUSPICIOUS_HOST_BLOCK_DURATION_MS` | `86400000` | Block duration (24 hours) |

### How It Works

1. **Normal hosts**: Track requests per window
2. **Rate limit exceeded**: Return 429 status
3. **Suspicious hosts**: Reduced limit (100 requests)
4. **Auto-blocking**: Hosts exceeding limit+10 are blocked for 24 hours

### Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1711800000000
```

### Testing Rate Limiting

```bash
# Simulate multiple requests
for i in {1..50}; do
  curl -H "Host: test.example.com" https://your-app.com/api/trpc/auth.me
done

# Check rate limit stats (admin only)
curl -H "Authorization: Bearer [token]" \
  https://your-app.com/api/trpc/securityMonitoring.getRateLimitStats
```

---

## 5. Host Rejection Monitoring

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOST_REJECTION_MONITORING_ENABLED` | `true` | Enable monitoring |
| `HOST_REJECTION_ALERT_THRESHOLD` | `10` | Rejections before alert |
| `HOST_REJECTION_ALERT_WINDOW_MS` | `3600000` | Alert window (1 hour) |
| `SECURITY_NOTIFICATIONS_ENABLED` | `true` | Send notifications |
| `SECURITY_NOTIFICATION_LEVEL` | `warning` | Alert severity level |

### How It Works

1. **Track rejections**: Every rejected request is logged
2. **Analyze patterns**: Count rejections per host
3. **Send alerts**: When threshold reached in time window
4. **Notify owner**: Alert sent via Manus notification system

### Alert Information

Alerts include:

- Host that triggered alert
- Total rejection count
- Rejections in alert window
- Primary rejection reason
- Detected IP addresses
- Timestamp of last rejection

---

## 6. Security Monitoring Dashboard

### Admin Procedures

Access via tRPC (admin/owner role only):

#### Get Rate Limit Statistics

```typescript
const stats = await trpc.securityMonitoring.getRateLimitStats.query();
// Returns: { totalTrackedHosts, suspiciousHosts, blockedHosts, hosts: {...} }
```

#### Get Host Rejection Statistics

```typescript
const stats = await trpc.securityMonitoring.getHostRejectionStats.query({
  host: "attacker.example.com"
});
// Returns: { host, totalRejections, reasons, uniqueIps, recentRejections }
```

#### Get All Rejection Statistics

```typescript
const allStats = await trpc.securityMonitoring.getAllRejectionStats.query();
// Returns: { totalHostsRejected, totalRejections, hosts: {...} }
```

#### Get Rejection History

```typescript
const history = await trpc.securityMonitoring.getRejectionHistory.query({
  host: "attacker.example.com",
  limit: 50,
  startTime: Date.now() - 86400000, // Last 24 hours
});
```

#### Get Top Rejected Hosts

```typescript
const topHosts = await trpc.securityMonitoring.getTopRejectedHosts.query({
  limit: 10
});
// Returns: [{ host, count, lastRejection, topReason }, ...]
```

#### Reset Rate Limit for Host

```typescript
const result = await trpc.securityMonitoring.resetRateLimitForHost.mutate({
  host: "app.wvtransports.com"
});
```

#### Unblock Host

```typescript
const result = await trpc.securityMonitoring.unblockHost.mutate({
  host: "attacker.example.com"
});
```

#### Clear Host Statistics

```typescript
const result = await trpc.securityMonitoring.clearHostStats.mutate({
  host: "attacker.example.com"
});
```

---

## 7. Logging & Debugging

### Server Logs

The server logs security events:

```
[Host Validation] Allowed hosts: [...]
[CORS] Allowed origins: [...]
[Host Validation] Rejected request from host: attacker.example.com
[Rate Limiter] Host marked as suspicious and blocked: ratelimit:attacker.example.com
[Host Monitoring] Rejection recorded for host: attacker.example.com
[Host Monitoring] Alert sent for host: attacker.example.com
```

### Log Files

Check logs in `.manus-logs/`:

```bash
# View server logs
tail -f .manus-logs/devserver.log | grep -E "Host Validation|Rate Limiter|Host Monitoring"

# View security events
grep "Host Validation\|Rate Limiter\|Host Monitoring" .manus-logs/devserver.log
```

---

## 8. Best Practices

### Production Deployment

1. **Set all environment variables** before deploying
2. **Enable rate limiting** in production
3. **Enable host rejection monitoring** for alerts
4. **Set appropriate thresholds** based on expected traffic
5. **Monitor alerts** regularly for suspicious activity

### Maintenance

1. **Review rejection statistics** weekly
2. **Unblock legitimate hosts** if incorrectly flagged
3. **Adjust rate limits** based on traffic patterns
4. **Update allowed hosts** when adding new domains
5. **Test CORS** after configuration changes

### Security Hardening

1. **Use HTTPS** for all production domains
2. **Enable auto-blocking** for suspicious hosts
3. **Set lower rate limits** for sensitive endpoints
4. **Monitor top rejected hosts** for attack patterns
5. **Keep alert threshold** reasonable (10-20 rejections)

---

## 9. Troubleshooting

### Legitimate Requests Being Rejected

**Problem**: Valid requests return 400 "Invalid host"

**Solution**:
1. Check `ALLOWED_HOSTS` includes your domain
2. Verify Host header matches configured domain
3. Check if running in production mode
4. Add domain to `ALLOWED_HOSTS` if needed

### CORS Errors in Browser

**Problem**: Browser blocks requests with CORS error

**Solution**:
1. Check `CORS_ORIGINS` includes your origin
2. Verify origin URL matches exactly (protocol + domain)
3. Check if credentials are needed (`withCredentials: true`)
4. Restart server after changing CORS_ORIGINS

### Rate Limit Blocking Legitimate Traffic

**Problem**: Valid requests return 429 "Too many requests"

**Solution**:
1. Increase `RATE_LIMIT_MAX_REQUESTS` if traffic is high
2. Increase `RATE_LIMIT_WINDOW_MS` for longer windows
3. Check if host is marked as suspicious
4. Use admin procedure to reset rate limit for host

### Not Receiving Alerts

**Problem**: No security alerts despite rejections

**Solution**:
1. Check `SECURITY_NOTIFICATIONS_ENABLED=true`
2. Verify `HOST_REJECTION_MONITORING_ENABLED=true`
3. Check if threshold reached (`HOST_REJECTION_ALERT_THRESHOLD`)
4. Verify owner notification settings in Manus dashboard
5. Check server logs for alert sending errors

---

## 10. Testing Checklist

Before deploying to production:

- [ ] Set all environment variables
- [ ] Test host validation with valid domain
- [ ] Test host validation rejects invalid domain
- [ ] Test CORS with valid origin
- [ ] Test CORS rejects invalid origin
- [ ] Test rate limiting with multiple requests
- [ ] Test rate limit headers in response
- [ ] Test host rejection monitoring records events
- [ ] Test admin can access security monitoring
- [ ] Test alerts are sent when threshold reached
- [ ] Test rate limit reset procedure
- [ ] Test host unblock procedure

---

## Support

For issues or questions:

1. Check `.manus-logs/devserver.log` for errors
2. Review this documentation
3. Test with curl commands provided
4. Contact Manus support at help.manus.im
