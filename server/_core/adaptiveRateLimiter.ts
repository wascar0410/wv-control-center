import os from "os";
import { Request, Response, NextFunction } from "express";
import { isIPWhitelisted } from "./ipWhitelist";

interface AdaptiveConfig {
  baseWindowMs: number;
  baseMaxRequests: number;
  cpuThreshold: number; // CPU usage % that triggers reduction
  memoryThreshold: number; // Memory usage % that triggers reduction
  reductionFactor: number; // How much to reduce limits
}

interface HostMetrics {
  count: number;
  resetTime: number;
  isSuspicious: boolean;
  suspiciousUntil?: number;
}

const config: AdaptiveConfig = {
  baseWindowMs: 15 * 60 * 1000, // 15 minutes
  baseMaxRequests: 5000,
  cpuThreshold: 80, // 80% CPU
  memoryThreshold: 85, // 85% memory
  reductionFactor: 0.5, // Reduce to 50% when overloaded
};

const metricsStore = new Map<string, HostMetrics>();

/**
 * Get current system load metrics
 */
function getSystemMetrics(): {
  cpuUsage: number;
  memoryUsage: number;
} {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Simple CPU usage calculation
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuUsage = 100 - ~~((100 * totalIdle) / totalTick);
  const memoryUsage = (usedMem / totalMem) * 100;

  return { cpuUsage, memoryUsage };
}

/**
 * Calculate adaptive limits based on system load
 */
function getAdaptiveLimits(): {
  windowMs: number;
  maxRequests: number;
  isOverloaded: boolean;
} {
  const { cpuUsage, memoryUsage } = getSystemMetrics();
  const isOverloaded =
    cpuUsage > config.cpuThreshold || memoryUsage > config.memoryThreshold;

  return {
    windowMs: config.baseWindowMs,
    maxRequests: isOverloaded
      ? Math.floor(config.baseMaxRequests * config.reductionFactor)
      : config.baseMaxRequests,
    isOverloaded,
  };
}

/**
 * Get rate limit key
 */
function getRateLimitKey(req: Request): string {
  const host = req.get("host") || req.ip || "unknown";
  return `adaptive:${host}`;
}

/**
 * Adaptive rate limiting middleware
 */
export function adaptiveRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  // Skip rate limiting in development
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const ip = req.ip || "unknown";

  // Skip rate limiting for whitelisted IPs
  if (isIPWhitelisted(ip)) {
    return next();
  }

  const key = getRateLimitKey(req);
  const now = Date.now();
  const { windowMs, maxRequests, isOverloaded } = getAdaptiveLimits();

  // Get or create metrics entry
  let metrics = metricsStore.get(key);
  if (!metrics || now > metrics.resetTime) {
    metrics = {
      count: 0,
      resetTime: now + windowMs,
      isSuspicious: false,
    };
    metricsStore.set(key, metrics);
  }

  // Check if host is blocked
  if (metrics.isSuspicious && metrics.suspiciousUntil && now < metrics.suspiciousUntil) {
    return res.status(429).json({
      error: "Too many requests",
      message: "Your host has been temporarily blocked due to suspicious activity",
      retryAfter: Math.ceil((metrics.suspiciousUntil - now) / 1000),
    });
  }

  // Increment counter
  metrics.count++;

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - metrics.count));
  res.setHeader("X-RateLimit-Reset", new Date(metrics.resetTime).toISOString());

  if (isOverloaded) {
    res.setHeader("X-RateLimit-Status", "overloaded");
  }

  // Check if limit exceeded
  if (metrics.count > maxRequests) {
    metrics.isSuspicious = true;
    metrics.suspiciousUntil = now + 60 * 60 * 1000; // Block for 1 hour

    console.warn(
      `[Adaptive Rate Limiter] Host ${key} exceeded limit (${metrics.count}/${maxRequests})`
    );

    return res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: 3600,
    });
  }

  next();
}

/**
 * Get current system status
 */
export function getSystemStatus(): {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  isOverloaded: boolean;
  currentLimits: {
    windowMs: number;
    maxRequests: number;
  };
  activeHosts: number;
} {
  const { cpuUsage, memoryUsage } = getSystemMetrics();
  const { windowMs, maxRequests, isOverloaded } = getAdaptiveLimits();

  return {
    timestamp: new Date().toISOString(),
    cpuUsage: Math.round(cpuUsage * 100) / 100,
    memoryUsage: Math.round(memoryUsage * 100) / 100,
    isOverloaded,
    currentLimits: { windowMs, maxRequests },
    activeHosts: metricsStore.size,
  };
}

/**
 * Clean up old metrics
 */
export function cleanupMetrics(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  metricsStore.forEach((metrics, key) => {
    if (now > metrics.resetTime + maxAge) {
      metricsStore.delete(key);
    }
  });
}

// Cleanup periodically
setInterval(() => {
  cleanupMetrics();
}, 60 * 60 * 1000); // Every hour
