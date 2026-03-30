# Rate Limiting Implementation Guide

## Overview

This project implements a comprehensive, three-layer rate limiting system designed to prevent abuse while maintaining excellent performance for legitimate users. The system includes request logging, IP whitelisting, and adaptive rate limiting based on server load.

## Architecture

### Layer 1: Request Logging (`requestLogger.ts`)

**Purpose**: Track all requests and detect abuse patterns in real-time.

**Features**:
- Logs all API requests and errors to `.logs/requests.log`
- Tracks 429 errors separately in `.logs/429-errors.log`
- Maintains in-memory abuse patterns with request counts per endpoint
- Automatic alerts when suspicious patterns are detected (50+ 429 errors)
- Automatic cleanup of old patterns (older than 24 hours)

**Key Functions**:
- `getAbusePatterns()`: Returns sorted list of hosts by error count
- `getAbuseReport()`: Generates summary report of abuse patterns
- `log429Error()`: Logs 429 errors with pattern tracking

### Layer 2: IP Whitelist (`ipWhitelist.ts`)

**Purpose**: Exclude known good IPs (office, servers, partners) from rate limiting.

**Features**:
- Persistent whitelist stored in `.config/ip-whitelist.json`
- Includes localhost (127.0.0.1, ::1) by default
- Track reason, timestamp, and who added each IP
- Easy management via admin endpoints

**Key Functions**:
- `isIPWhitelisted(ip)`: Check if IP is whitelisted
- `addToWhitelist(ip, reason, host, addedBy)`: Add IP to whitelist
- `removeFromWhitelist(ip)`: Remove IP from whitelist
- `getWhitelist()`: Get all whitelisted IPs
- `reloadWhitelist()`: Reload from file

### Layer 3: Adaptive Rate Limiting (`adaptiveRateLimiter.ts`)

**Purpose**: Dynamically adjust rate limits based on server load.

**Features**:
- Monitors CPU usage and memory usage in real-time
- Reduces limits by 50% when CPU > 80% or memory > 85%
- Only applies in production (disabled in development)
- Respects whitelisted IPs
- Sets rate limit headers in responses
- Automatic cleanup of old metrics (24 hours)

**Configuration**:
```typescript
{
  baseWindowMs: 15 * 60 * 1000,      // 15-minute window
  baseMaxRequests: 5000,              // 5000 requests per window
  cpuThreshold: 80,                   // CPU % that triggers reduction
  memoryThreshold: 85,                // Memory % that triggers reduction
  reductionFactor: 0.5,               // Reduce to 50% when overloaded
}
```

**Key Functions**:
- `adaptiveRateLimiter()`: Express middleware
- `getSystemStatus()`: Get current CPU, memory, and limits
- `cleanupMetrics()`: Cleanup old metrics

## Admin Endpoints

Access these endpoints via tRPC at `/api/trpc/admin.*` (admin users only):

### `admin.getAbuseReport`

Returns current abuse patterns and statistics.

```typescript
{
  timestamp: string;
  totalPatterns: number;
  topOffenders: AbusePattern[];
  summary: string;
}
```

### `admin.getSystemStatus`

Returns current system load and rate limiting status.

```typescript
{
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  isOverloaded: boolean;
  currentLimits: { windowMs: number; maxRequests: number };
  activeHosts: number;
}
```

### `admin.getWhitelist`

Returns all whitelisted IPs.

```typescript
WhitelistEntry[]
```

### `admin.addToWhitelist`

Add IP to whitelist.

```typescript
Input: { ip: string; reason: string; host?: string }
Output: { success: boolean; message: string }
```

### `admin.removeFromWhitelist`

Remove IP from whitelist.

```typescript
Input: { ip: string }
Output: { success: boolean; message: string }
```

### `admin.isIPWhitelisted`

Check if IP is whitelisted.

```typescript
Input: { ip: string }
Output: boolean
```

## Monitoring

### Log Files

All logs are stored in `.logs/` directory:

- **requests.log**: All API requests and errors
- **429-errors.log**: 429 errors with pattern details

### Console Alerts

Watch for these console messages:

```
[Whitelist] Added IP x.x.x.x (reason)
[Whitelist] Removed IP x.x.x.x
[Abuse ALERT] Host x.x.x.x (x.x.x.x) has 50 429 errors
[Abuse ALERT] Top endpoints: {...}
[Adaptive Rate Limiter] Host ... exceeded limit (count/limit)
```

## Development vs Production

### Development Mode (`NODE_ENV=development`)

- Rate limiting **disabled** for all routes
- Dev assets (JS, CSS, favicon) bypass all rate limiting
- Request logging still active for debugging
- Perfect for development without restrictions

### Production Mode (`NODE_ENV=production`)

- Adaptive rate limiting active on `/api/*` routes
- IP whitelist respected
- Request logging active
- System load monitoring active
- Automatic alerts on abuse patterns

## Best Practices

### 1. Whitelist Known IPs

Add office and server IPs to whitelist to prevent false positives:

```typescript
// Via admin endpoint
await trpc.admin.addToWhitelist.mutate({
  ip: "203.0.113.42",
  reason: "Office network",
  host: "office.example.com"
});
```

### 2. Monitor Abuse Patterns

Check abuse report regularly:

```typescript
const report = await trpc.admin.getAbuseReport.query();
console.log(report.topOffenders);
```

### 3. Monitor System Load

Watch system status to ensure rate limits are appropriate:

```typescript
const status = await trpc.admin.getSystemStatus.query();
if (status.isOverloaded) {
  console.warn("Server overloaded, limits reduced");
}
```

### 4. Review Logs

Regularly review `.logs/429-errors.log` for patterns:

```bash
tail -f .logs/429-errors.log
```

## Troubleshooting

### High 429 Error Rate

1. Check if legitimate users are whitelisted
2. Review abuse patterns: `trpc.admin.getAbuseReport.query()`
3. Check system load: `trpc.admin.getSystemStatus.query()`
4. Increase base limits if needed (edit `adaptiveRateLimiter.ts`)

### False Positives

1. Add IP to whitelist: `trpc.admin.addToWhitelist.mutate(...)`
2. Check if IP is shared (office, proxy, VPN)
3. Consider increasing base limits for legitimate high-traffic users

### Server Overload

1. Check system status: `trpc.admin.getSystemStatus.query()`
2. Limits automatically reduce by 50% when overloaded
3. Consider scaling up server resources
4. Review slow endpoints in logs

## Future Improvements

1. **Persistent Storage**: Move abuse patterns to database for cross-instance tracking
2. **Geographic Blocking**: Block requests from specific countries if needed
3. **Rate Limit Tiers**: Different limits for different user types (free, premium, etc.)
4. **Webhook Alerts**: Send alerts to Slack/email when abuse detected
5. **Dashboard**: Visual monitoring of rate limiting metrics
6. **Machine Learning**: Detect unusual patterns automatically

## References

- [Express Rate Limiting Best Practices](https://expressjs.com/en/advanced/best-practice-security.html#use-a-reverse-proxy)
- [Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
