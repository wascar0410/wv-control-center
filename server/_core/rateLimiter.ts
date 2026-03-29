import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    isSuspicious: boolean;
    suspiciousUntil?: number;
  };
}

interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  suspiciousMaxRequests: number;
  autoBlockSuspicious: boolean;
  blockDurationMs: number;
}

// In-memory store for rate limiting data
const rateLimitStore: RateLimitStore = {};

// Configuration from environment variables
export const rateLimitConfig: RateLimitConfig = {
  enabled: process.env.RATE_LIMITING_ENABLED !== "false",
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes default
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "5000"), // Increased from 1000 to 5000
  suspiciousMaxRequests: parseInt(process.env.RATE_LIMIT_SUSPICIOUS_MAX_REQUESTS || "500"), // Increased from 100 to 500
  autoBlockSuspicious: process.env.AUTO_BLOCK_SUSPICIOUS_HOSTS !== "false",
  blockDurationMs: parseInt(process.env.SUSPICIOUS_HOST_BLOCK_DURATION_MS || "3600000"), // Reduced from 24h to 1h
};

// Hosts that should be excluded from rate limiting
const EXCLUDED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1', // IPv6 localhost
  'localhost:3000',
  'localhost:5173',
  'app.wvtransports.com',
  'api.wvtransports.com',
]);

// Static asset paths that should not be rate limited
const STATIC_ASSET_PATHS = [
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.ico',
  '.map', // Source maps
];

/**
 * Get the rate limit key for a request (based on host or IP)
 */
function getRateLimitKey(req: Request): string {
  const host = req.get("host") || req.ip || "unknown";
  return `ratelimit:${host}`;
}

/**
 * Check if a host is currently blocked
 */
function isHostBlocked(key: string): boolean {
  const entry = rateLimitStore[key];
  if (!entry || !entry.suspiciousUntil) return false;
  
  if (Date.now() > entry.suspiciousUntil) {
    // Block duration expired, unblock the host
    entry.isSuspicious = false;
    entry.suspiciousUntil = undefined;
    return false;
  }
  
  return entry.isSuspicious;
}

/**
 * Mark a host as suspicious and optionally block it
 */
export function markHostAsSuspicious(key: string): void {
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: Date.now() + rateLimitConfig.windowMs,
      isSuspicious: true,
      suspiciousUntil: Date.now() + rateLimitConfig.blockDurationMs,
    };
  } else {
    rateLimitStore[key].isSuspicious = true;
    rateLimitStore[key].suspiciousUntil = Date.now() + rateLimitConfig.blockDurationMs;
  }
  
  console.warn(`[Rate Limiter] Host marked as suspicious and blocked: ${key}`);
}

/**
 * Get current rate limit status for a host
 */
export function getRateLimitStatus(key: string) {
  const entry = rateLimitStore[key];
  if (!entry) {
    return {
      count: 0,
      limit: rateLimitConfig.maxRequests,
      remaining: rateLimitConfig.maxRequests,
      resetTime: Date.now() + rateLimitConfig.windowMs,
      isSuspicious: false,
    };
  }

  const limit = entry.isSuspicious ? rateLimitConfig.suspiciousMaxRequests : rateLimitConfig.maxRequests;
  const remaining = Math.max(0, limit - entry.count);
  
  return {
    count: entry.count,
    limit,
    remaining,
    resetTime: entry.resetTime,
    isSuspicious: entry.isSuspicious,
  };
}

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const key in rateLimitStore) {
    const entry = rateLimitStore[key];
    if (now > entry.resetTime && (!entry.suspiciousUntil || now > entry.suspiciousUntil)) {
      delete rateLimitStore[key];
    }
  }
}

/**
 * Check if a request should be excluded from rate limiting
 */
function shouldExcludeFromRateLimit(req: Request, key: string): boolean {
  // Extract host without port
  const host = req.get('host') || '';
  const hostWithoutPort = host.split(':')[0];
  
  // Check if host is in excluded list
  if (EXCLUDED_HOSTS.has(hostWithoutPort) || EXCLUDED_HOSTS.has(host)) {
    return true;
  }
  
  // Check if request is for a static asset
  const path = req.path || '';
  if (STATIC_ASSET_PATHS.some(ext => path.endsWith(ext))) {
    return true;
  }
  
  return false;
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!rateLimitConfig.enabled) {
    return next();
  }

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  const key = getRateLimitKey(req);
  const now = Date.now();
  
  // Skip rate limiting for excluded hosts and static assets
  if (shouldExcludeFromRateLimit(req, key)) {
    return next();
  }

  // Check if host is blocked
  if (isHostBlocked(key)) {
    console.warn(`[Rate Limiter] Blocked request from suspicious host: ${key}`);
    res.status(429).json({
      error: "Too many requests",
      message: "Your host has been temporarily blocked due to suspicious activity",
      retryAfter: rateLimitStore[key].suspiciousUntil,
    });
    return;
  }

  // Initialize or reset entry if window has expired
  if (!rateLimitStore[key] || now > rateLimitStore[key].resetTime) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + rateLimitConfig.windowMs,
      isSuspicious: false,
    };
  }

  const entry = rateLimitStore[key];
  const limit = entry.isSuspicious ? rateLimitConfig.suspiciousMaxRequests : rateLimitConfig.maxRequests;

  // Increment request count
  entry.count++;

  // Set rate limit headers
  res.set("X-RateLimit-Limit", limit.toString());
  res.set("X-RateLimit-Remaining", Math.max(0, limit - entry.count).toString());
  res.set("X-RateLimit-Reset", entry.resetTime.toString());

  // Check if limit exceeded
  if (entry.count > limit) {
    console.warn(`[Rate Limiter] Rate limit exceeded for host: ${key} (${entry.count}/${limit})`);
    
    // Mark as suspicious if auto-blocking is enabled
    if (rateLimitConfig.autoBlockSuspicious && entry.count > limit + 10) {
      markHostAsSuspicious(key);
    }

    res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded",
      retryAfter: entry.resetTime,
    });
    return;
  }

  next();
}

/**
 * Get rate limiting statistics for monitoring
 */
export function getRateLimitStats() {
  const stats = {
    totalTrackedHosts: Object.keys(rateLimitStore).length,
    suspiciousHosts: 0,
    blockedHosts: 0,
    hosts: {} as Record<string, any>,
  };

  for (const key in rateLimitStore) {
    const entry = rateLimitStore[key];
    if (entry.isSuspicious) {
      stats.suspiciousHosts++;
      if (isHostBlocked(key)) {
        stats.blockedHosts++;
      }
    }

    stats.hosts[key] = {
      count: entry.count,
      isSuspicious: entry.isSuspicious,
      isCurrentlyBlocked: isHostBlocked(key),
      resetTime: entry.resetTime,
      suspiciousUntil: entry.suspiciousUntil,
    };
  }

  return stats;
}

/**
 * Reset rate limit for a specific host (admin function)
 */
export function resetRateLimitForHost(key: string): boolean {
  if (rateLimitStore[key]) {
    delete rateLimitStore[key];
    console.log(`[Rate Limiter] Reset rate limit for host: ${key}`);
    return true;
  }
  return false;
}

/**
 * Unblock a host (admin function)
 */
export function unblockHost(key: string): boolean {
  if (rateLimitStore[key]) {
    rateLimitStore[key].isSuspicious = false;
    rateLimitStore[key].suspiciousUntil = undefined;
    console.log(`[Rate Limiter] Unblocked host: ${key}`);
    return true;
  }
  return false;
}
