import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  host: string;
  ip: string;
  userAgent: string;
  duration: number;
  error?: string;
}

interface AbusePattern {
  host: string;
  ip: string;
  count: number;
  lastSeen: number;
  endpoints: Record<string, number>;
}

const logsDir = path.resolve(process.cwd(), ".logs");
const abusePatterns = new Map<string, AbusePattern>();

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Get or create abuse pattern for a host
 */
function getAbusePattern(host: string, ip: string): AbusePattern {
  const key = `${host}:${ip}`;
  if (!abusePatterns.has(key)) {
    abusePatterns.set(key, {
      host,
      ip,
      count: 0,
      lastSeen: Date.now(),
      endpoints: {},
    });
  }
  return abusePatterns.get(key)!;
}

/**
 * Log request to file
 */
function logRequest(log: RequestLog): void {
  const logFile = path.join(logsDir, "requests.log");
  const logEntry = JSON.stringify(log) + "\n";
  
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) console.error("Failed to write request log:", err);
  });
}

/**
 * Log 429 errors specifically
 */
function log429Error(req: Request, host: string, ip: string): void {
  const pattern = getAbusePattern(host, ip);
  pattern.count++;
  pattern.lastSeen = Date.now();
  pattern.endpoints[req.path] = (pattern.endpoints[req.path] || 0) + 1;

  const errorLog = {
    timestamp: new Date().toISOString(),
    type: "429_ERROR",
    host,
    ip,
    path: req.path,
    method: req.method,
    userAgent: req.get("user-agent"),
    patternCount: pattern.count,
    endpoints: pattern.endpoints,
  };

  const errorFile = path.join(logsDir, "429-errors.log");
  fs.appendFile(errorFile, JSON.stringify(errorLog) + "\n", (err) => {
    if (err) console.error("Failed to write 429 log:", err);
  });

  // Alert if suspicious pattern detected
  if (pattern.count > 50 && pattern.count % 10 === 0) {
    console.warn(`[ABUSE ALERT] Host ${host} (${ip}) has ${pattern.count} 429 errors`);
    console.warn(`[ABUSE ALERT] Top endpoints: ${JSON.stringify(pattern.endpoints)}`);
  }
}

/**
 * Clean up old abuse patterns (older than 24 hours)
 */
function cleanupAbusePatterns(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const keysToDelete: string[] = [];

  abusePatterns.forEach((pattern, key) => {
    if (now - pattern.lastSeen > maxAge) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    abusePatterns.delete(key);
  });
}

/**
 * Get current abuse patterns for monitoring
 */
export function getAbusePatterns(): AbusePattern[] {
  const patterns: AbusePattern[] = [];
  abusePatterns.forEach((pattern) => {
    patterns.push(pattern);
  });
  return patterns.sort((a, b) => b.count - a.count);
}

/**
 * Request logging middleware
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const host = req.get("host") || "unknown";
  const ip = req.ip || "unknown";

  // Intercept response to log it
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status,
      host,
      ip,
      userAgent: req.get("user-agent") || "unknown",
      duration,
    };

    // Log 429 errors specifically
    if (status === 429) {
      log429Error(req, host, ip);
    }

    // Only log API requests and errors
    if (req.path.startsWith("/api") || status >= 400) {
      logRequest(log);
    }

    return originalSend.call(this, data);
  };

  // Clean up old patterns periodically
  if (Math.random() < 0.01) {
    cleanupAbusePatterns();
  }

  next();
}

/**
 * Get abuse report
 */
export function getAbuseReport(): {
  timestamp: string;
  totalPatterns: number;
  topOffenders: AbusePattern[];
  summary: string;
} {
  const patterns = getAbusePatterns();
  const topOffenders = patterns.slice(0, 10);

  return {
    timestamp: new Date().toISOString(),
    totalPatterns: patterns.length,
    topOffenders,
    summary: `${patterns.length} unique hosts detected. Top offender: ${
      topOffenders[0]?.host || "none"
    } with ${topOffenders[0]?.count || 0} errors.`,
  };
}
