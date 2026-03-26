import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" | "driver" = "driver", userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("driverStats.getStats", () => {
  it("should reject if user tries to access other driver's stats", async () => {
    const ctx = createAuthContext("driver", 1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.driverStats.getStats({ driverId: 2 });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("No tienes permiso");
    }
  });

  it("should allow driver to access their own stats", async () => {
    const ctx = createAuthContext("driver", 279);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.driverStats.getStats({ driverId: 279 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("totalDeliveries");
    expect(result).toHaveProperty("totalIncome");
    expect(result).toHaveProperty("totalFuelExpense");
    expect(result).toHaveProperty("totalNetMargin");
    expect(result).toHaveProperty("activeLoads");
    expect(result).toHaveProperty("avgMarginPerDelivery");
    expect(result).toHaveProperty("efficiency");
  });

  it("should allow admin to access any driver's stats", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.driverStats.getStats({ driverId: 279 });
    expect(result).toBeDefined();
  });
});

describe("driverStats.getMonthlyTrends", () => {
  it("should reject if user tries to access other driver's trends", async () => {
    const ctx = createAuthContext("driver", 1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.driverStats.getMonthlyTrends({ driverId: 2, months: 6 });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("No tienes permiso");
    }
  });

  it("should validate months parameter", async () => {
    const ctx = createAuthContext("driver", 279);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.driverStats.getMonthlyTrends({ driverId: 279, months: 25 });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Too big");
    }
  });

  it("should return monthly trends data", async () => {
    const ctx = createAuthContext("driver", 279);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.driverStats.getMonthlyTrends({ driverId: 279, months: 6 });
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const trend = result[0];
      expect(trend).toHaveProperty("month");
      expect(trend).toHaveProperty("income");
      expect(trend).toHaveProperty("expenses");
      expect(trend).toHaveProperty("netMargin");
      expect(trend).toHaveProperty("deliveries");
    }
  });
});

describe("driverStats.getRecentDeliveries", () => {
  it("should reject if user tries to access other driver's deliveries", async () => {
    const ctx = createAuthContext("driver", 1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.driverStats.getRecentDeliveries({ driverId: 2, limit: 10 });
      expect.fail("Should have thrown permission error");
    } catch (error: any) {
      expect(error.message).toContain("No tienes permiso");
    }
  });

  it("should validate limit parameter", async () => {
    const ctx = createAuthContext("driver", 279);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.driverStats.getRecentDeliveries({ driverId: 279, limit: 100 });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Too big");
    }
  });

  it("should return recent deliveries", async () => {
    const ctx = createAuthContext("driver", 279);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.driverStats.getRecentDeliveries({ driverId: 279, limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const delivery = result[0];
      expect(delivery).toHaveProperty("id");
      expect(delivery).toHaveProperty("clientName");
      expect(delivery).toHaveProperty("price");
      expect(delivery).toHaveProperty("status");
    }
  });

  it("should allow admin to access any driver's deliveries", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.driverStats.getRecentDeliveries({ driverId: 279, limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});
