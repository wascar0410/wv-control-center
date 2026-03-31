/**
 * Health Check Endpoint for Railway
 * 
 * Railway uses this endpoint to:
 * - Verify the service is running
 * - Perform health checks
 * - Route traffic only to healthy instances
 */

import type { Express } from "express";

export function setupHealthCheck(app: Express): void {
  /**
   * Basic health check endpoint
   * Returns 200 if service is running
   */
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  /**
   * Detailed health check endpoint
   * Returns detailed information about service health
   */
  app.get("/health/detailed", (req, res) => {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: checkDatabase(),
        memory: checkMemory(),
        cpu: checkCPU(),
      },
    };

    res.status(200).json(health);
  });

  /**
   * Readiness probe for Kubernetes/Railway
   * Returns 200 if service is ready to receive traffic
   */
  app.get("/ready", (req, res) => {
    const isReady = checkReadiness();
    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Liveness probe for Kubernetes/Railway
   * Returns 200 if service is alive
   */
  app.get("/alive", (req, res) => {
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Check database connectivity
 */
function checkDatabase(): { status: string; latency?: number } {
  try {
    // In a real implementation, you would query the database
    // For now, just check if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      return { status: "ok" };
    }
    return { status: "error" };
  } catch (error) {
    return { status: "error" };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: string; usage: string } {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // Warn if heap usage is above 80%
  const status = heapUsedPercent > 80 ? "warning" : "ok";

  return {
    status,
    usage: `${Math.round(heapUsedPercent)}%`,
  };
}

/**
 * Check CPU usage
 */
function checkCPU(): { status: string; usage: string } {
  const cpuUsage = process.cpuUsage();
  const totalCPU = cpuUsage.user + cpuUsage.system;

  // This is a simple check; in production you might use os.cpus()
  return {
    status: "ok",
    usage: `${Math.round(totalCPU / 1000000)}ms`,
  };
}

/**
 * Check if service is ready to receive traffic
 */
function checkReadiness(): boolean {
  // Service is ready if:
  // 1. Database URL is configured
  // 2. Memory usage is reasonable
  // 3. No critical errors

  const hasDatabase = !!process.env.DATABASE_URL;
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  const memoryOk = heapUsedPercent < 90;

  return hasDatabase && memoryOk;
}

export default setupHealthCheck;
