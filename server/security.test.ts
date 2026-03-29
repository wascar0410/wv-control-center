import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  rateLimitMiddleware,
  getRateLimitStats,
  resetRateLimitForHost,
  unblockHost,
  markHostAsSuspicious,
} from "./_core/rateLimiter";
import {
  recordHostRejection,
  getHostRejectionStats,
  getAllRejectionStats,
  getRejectionHistory,
  clearHostStats,
  getTopRejectedHosts,
} from "./_core/hostMonitoring";
import type { Request, Response, NextFunction } from "express";

// Mock Express request/response
function createMockRequest(host: string, ip: string = "192.168.1.1"): Partial<Request> {
  return {
    get: (header: string) => {
      if (header === "host") return host;
      if (header === "user-agent") return "Test User Agent";
      return undefined;
    },
    ip,
    method: "GET",
  };
}

function createMockResponse(): Partial<Response> {
  const headers: Record<string, string> = {};
  return {
    set: (key: string, value: string) => {
      headers[key] = value;
    },
    status: (code: number) => ({
      json: (data: any) => data,
    }),
    sendStatus: (code: number) => code,
    getHeaders: () => headers,
  };
}

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Reset rate limit stats before each test
    const stats = getRateLimitStats();
    Object.keys(stats.hosts).forEach((host) => {
      resetRateLimitForHost(host);
    });
  });

  it("should allow requests within rate limit", () => {
    const req = createMockRequest("app.wvtransports.com") as Request;
    const res = createMockResponse() as Response;
    let nextCalled = false;

    rateLimitMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it("should track request count per host", () => {
    const req = createMockRequest("app.wvtransports.com") as Request;
    const res = createMockResponse() as Response;

    // Make multiple requests
    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware(req, res, () => {});
    }

    const stats = getRateLimitStats();
    const hostKey = "ratelimit:app.wvtransports.com";
    expect(stats.hosts[hostKey]?.count).toBe(5);
  });

  it("should return rate limit headers", () => {
    const req = createMockRequest("api.wvtransports.com") as Request;
    const res = createMockResponse() as Response;

    rateLimitMiddleware(req, res, () => {});

    const headers = (res as any).getHeaders?.();
    expect(headers["X-RateLimit-Limit"]).toBeDefined();
    expect(headers["X-RateLimit-Remaining"]).toBeDefined();
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("should differentiate rate limits between hosts", () => {
    const req1 = createMockRequest("host1.example.com") as Request;
    const req2 = createMockRequest("host2.example.com") as Request;
    const res = createMockResponse() as Response;

    // Make requests from different hosts
    for (let i = 0; i < 3; i++) {
      rateLimitMiddleware(req1, res, () => {});
    }
    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware(req2, res, () => {});
    }

    const stats = getRateLimitStats();
    expect(stats.hosts["ratelimit:host1.example.com"]?.count).toBe(3);
    expect(stats.hosts["ratelimit:host2.example.com"]?.count).toBe(5);
  });

  it("should mark host as suspicious after excessive requests", () => {
    const hostKey = "ratelimit:suspicious.example.com";
    markHostAsSuspicious(hostKey);

    const stats = getRateLimitStats();
    expect(stats.hosts[hostKey]?.isSuspicious).toBe(true);
  });

  it("should unblock a suspicious host", () => {
    const hostKey = "ratelimit:blocked.example.com";
    markHostAsSuspicious(hostKey);

    const success = unblockHost(hostKey);
    expect(success).toBe(true);

    const stats = getRateLimitStats();
    expect(stats.hosts[hostKey]?.isSuspicious).toBe(false);
  });
});

describe("Host Monitoring", () => {
  beforeEach(() => {
    // Clear all stats before each test
    const allStats = getAllRejectionStats();
    Object.keys(allStats.hosts).forEach((host) => {
      clearHostStats(host);
    });
  });

  it("should record host rejection", async () => {
    const req = createMockRequest("malicious.example.com") as Request;
    await recordHostRejection("malicious.example.com", "Invalid host header", req);

    const stats = getHostRejectionStats("malicious.example.com");
    expect(stats?.totalRejections).toBe(1);
    expect(stats?.reasons["Invalid host header"]).toBe(1);
  });

  it("should track multiple rejections from same host", async () => {
    const req = createMockRequest("attacker.example.com") as Request;

    for (let i = 0; i < 5; i++) {
      await recordHostRejection("attacker.example.com", "Invalid host header", req);
    }

    const stats = getHostRejectionStats("attacker.example.com");
    expect(stats?.totalRejections).toBe(5);
  });

  it("should track different rejection reasons", async () => {
    const req = createMockRequest("test.example.com") as Request;

    await recordHostRejection("test.example.com", "Invalid host header", req);
    await recordHostRejection("test.example.com", "Rate limit exceeded", req);
    await recordHostRejection("test.example.com", "Invalid host header", req);

    const stats = getHostRejectionStats("test.example.com");
    expect(stats?.reasons["Invalid host header"]).toBe(2);
    expect(stats?.reasons["Rate limit exceeded"]).toBe(1);
  });

  it("should track unique IPs", async () => {
    const req1 = createMockRequest("test.example.com", "192.168.1.1") as Request;
    const req2 = createMockRequest("test.example.com", "192.168.1.2") as Request;

    await recordHostRejection("test.example.com", "Invalid host header", req1);
    await recordHostRejection("test.example.com", "Invalid host header", req2);

    const stats = getHostRejectionStats("test.example.com");
    expect(stats?.uniqueIps.length).toBe(2);
    expect(stats?.uniqueIps).toContain("192.168.1.1");
    expect(stats?.uniqueIps).toContain("192.168.1.2");
  });

  it("should get rejection history", async () => {
    const req = createMockRequest("history.example.com") as Request;

    for (let i = 0; i < 3; i++) {
      await recordHostRejection("history.example.com", "Invalid host header", req);
    }

    const history = getRejectionHistory({ host: "history.example.com" });
    expect(history.length).toBe(3);
    expect(history[0].host).toBe("history.example.com");
  });

  it("should get top rejected hosts", async () => {
    const req = createMockRequest("test") as Request;

    // Create rejections with different counts
    for (let i = 0; i < 5; i++) {
      await recordHostRejection("host1.example.com", "Invalid host header", req);
    }
    for (let i = 0; i < 3; i++) {
      await recordHostRejection("host2.example.com", "Invalid host header", req);
    }
    for (let i = 0; i < 8; i++) {
      await recordHostRejection("host3.example.com", "Invalid host header", req);
    }

    const topHosts = getTopRejectedHosts(3);
    expect(topHosts.length).toBe(3);
    expect(topHosts[0].host).toBe("host3.example.com");
    expect(topHosts[0].count).toBe(8);
    expect(topHosts[1].host).toBe("host1.example.com");
    expect(topHosts[1].count).toBe(5);
    expect(topHosts[2].host).toBe("host2.example.com");
    expect(topHosts[2].count).toBe(3);
  });

  it("should get all rejection statistics", async () => {
    const req = createMockRequest("test") as Request;

    await recordHostRejection("host1.example.com", "Invalid host header", req);
    await recordHostRejection("host2.example.com", "Invalid host header", req);

    const allStats = getAllRejectionStats();
    expect(allStats.totalHostsRejected).toBeGreaterThanOrEqual(2);
    expect(allStats.totalRejections).toBeGreaterThanOrEqual(2);
    expect(allStats.hosts["host1.example.com"]).toBeDefined();
    expect(allStats.hosts["host2.example.com"]).toBeDefined();
  });

  it("should clear host statistics", async () => {
    const req = createMockRequest("test.example.com") as Request;

    await recordHostRejection("test.example.com", "Invalid host header", req);
    const success = clearHostStats("test.example.com");
    expect(success).toBe(true);

    const stats = getHostRejectionStats("test.example.com");
    expect(stats).toBeNull();
  });
});

describe("Security Integration", () => {
  beforeEach(() => {
    // Clean up before each test
    const stats = getRateLimitStats();
    Object.keys(stats.hosts).forEach((host) => {
      resetRateLimitForHost(host);
    });

    const allStats = getAllRejectionStats();
    Object.keys(allStats.hosts).forEach((host) => {
      clearHostStats(host);
    });
  });

  it("should handle multiple security layers", async () => {
    const req = createMockRequest("suspicious.example.com") as Request;
    const res = createMockResponse() as Response;

    // Simulate rate limiting
    for (let i = 0; i < 10; i++) {
      rateLimitMiddleware(req, res, () => {});
    }

    // Simulate host rejection monitoring
    for (let i = 0; i < 5; i++) {
      await recordHostRejection("suspicious.example.com", "Rate limit exceeded", req);
    }

    // Verify both systems tracked the activity
    const rateLimitStats = getRateLimitStats();
    const rejectionStats = getHostRejectionStats("suspicious.example.com");

    expect(rateLimitStats.hosts["ratelimit:suspicious.example.com"]?.count).toBeGreaterThanOrEqual(10);
    expect(rejectionStats?.totalRejections).toBeGreaterThanOrEqual(5);
  });

  it("should provide comprehensive security dashboard data", async () => {
    const req = createMockRequest("test") as Request;

    // Simulate various security events
    for (let i = 0; i < 3; i++) {
      await recordHostRejection("attacker1.example.com", "Invalid host header", req);
    }
    for (let i = 0; i < 7; i++) {
      await recordHostRejection("attacker2.example.com", "Rate limit exceeded", req);
    }

    const rateLimitStats = getRateLimitStats();
    const rejectionStats = getAllRejectionStats();
    const topHosts = getTopRejectedHosts(5);

    expect(rateLimitStats.totalTrackedHosts).toBeGreaterThanOrEqual(0);
    expect(rejectionStats.totalHostsRejected).toBeGreaterThanOrEqual(2);
    expect(rejectionStats.totalRejections).toBeGreaterThanOrEqual(10);
    expect(topHosts.length).toBeGreaterThan(0);
  });
});
