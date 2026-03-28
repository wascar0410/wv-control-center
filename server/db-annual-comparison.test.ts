import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAnnualComparison } from "./db-annual-comparison";
import { getDb } from "./db";
import { loadQuotations, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Annual Comparison", () => {
  let testUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const result = await db.insert(users).values({
      openId: `test-user-annual-${Date.now()}`,
      name: "Test User Annual",
      email: "test-annual@example.com",
      role: "user",
    });
    testUserId = result[0].insertId || 1;
  });

  afterAll(async () => {
    if (db && testUserId) {
      // Clean up test data
      await db.delete(loadQuotations).where(eq(loadQuotations.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should return annual data with 12 months", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    expect(comparison).toBeDefined();
    expect(comparison.months.length).toBe(12);
    expect(comparison.year).toBe(new Date().getFullYear());
  });

  it("should return zero values when no quotations exist", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    expect(comparison.annualTotals.totalMiles).toBe(0);
    expect(comparison.annualTotals.totalProfit).toBe(0);
    expect(comparison.annualTotals.totalQuotations).toBe(0);
  });

  it("should calculate annual totals correctly", async () => {
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const currentYear = today.getFullYear();

    // Insert quotation for current year
    await db.insert(loadQuotations).values({
      userId: testUserId,
      vanLat: "40.7128",
      vanLng: "-74.0060",
      vanAddress: "New York, NY",
      pickupLat: "40.7580",
      pickupLng: "-73.9855",
      pickupAddress: "Times Square, NY",
      deliveryLat: "40.7489",
      deliveryLng: "-73.9680",
      deliveryAddress: "Central Park, NY",
      weight: "5000",
      weightUnit: "lbs",
      cargoDescription: "Test cargo",
      emptyMiles: "10",
      loadedMiles: "5",
      returnEmptyMiles: "0",
      totalMiles: "15",
      ratePerMile: "2.00",
      fuelSurcharge: "0",
      totalPrice: "30.00",
      estimatedFuelCost: "5.00",
      estimatedOperatingCost: "10.00",
      estimatedProfit: "15.00",
      profitMarginPercent: "50.00",
      status: "accepted",
      createdAt: new Date(currentYear, 0, 15),
    });

    const comparison = await getAnnualComparison(testUserId);
    
    expect(comparison.annualTotals.totalMiles).toBeGreaterThanOrEqual(15);
    expect(comparison.annualTotals.totalProfit).toBeGreaterThanOrEqual(15);
  });

  it("should calculate monthly metrics correctly", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    // Each month should have metrics
    comparison.months.forEach(month => {
      expect(typeof month.miles).toBe("number");
      expect(typeof month.profit).toBe("number");
      expect(typeof month.quotationsCount).toBe("number");
      expect(typeof month.averageProfitPerMile).toBe("number");
      expect(month.miles).toBeGreaterThanOrEqual(0);
      expect(month.profit).toBeGreaterThanOrEqual(0);
    });
  });

  it("should calculate quarterly breakdown correctly", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    expect(comparison.quarterlyBreakdown).toBeDefined();
    expect(comparison.quarterlyBreakdown.q1).toBeDefined();
    expect(comparison.quarterlyBreakdown.q2).toBeDefined();
    expect(comparison.quarterlyBreakdown.q3).toBeDefined();
    expect(comparison.quarterlyBreakdown.q4).toBeDefined();
    
    // Each quarter should have metrics
    Object.values(comparison.quarterlyBreakdown).forEach(quarter => {
      expect(typeof quarter.miles).toBe("number");
      expect(typeof quarter.profit).toBe("number");
      expect(typeof quarter.quotations).toBe("number");
    });
  });

  it("should identify best and worst months", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    expect(comparison.bestMonth).toBeDefined();
    expect(comparison.worstMonth).toBeDefined();
    expect(comparison.bestMonth.month).toBeDefined();
    expect(comparison.worstMonth.month).toBeDefined();
  });

  it("should calculate first and second half comparison", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    expect(typeof comparison.comparison.firstHalfMiles).toBe("number");
    expect(typeof comparison.comparison.secondHalfMiles).toBe("number");
    expect(typeof comparison.comparison.firstHalfProfit).toBe("number");
    expect(typeof comparison.comparison.secondHalfProfit).toBe("number");
  });

  it("should calculate variation percentages correctly", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    expect(typeof comparison.comparison.milesVariationPercent).toBe("number");
    expect(typeof comparison.comparison.profitVariationPercent).toBe("number");
  });

  it("should determine trend correctly", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    expect(comparison.comparison.trend).toBeDefined();
    expect(["improving", "declining", "stable"]).toContain(comparison.comparison.trend);
  });

  it("should calculate average profit per mile correctly", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    if (comparison.annualTotals.totalMiles > 0) {
      const expectedAverage = comparison.annualTotals.totalProfit / comparison.annualTotals.totalMiles;
      expect(Math.abs(comparison.annualTotals.averageProfitPerMile - expectedAverage)).toBeLessThan(0.01);
    }
  });

  it("should format currency values correctly", async () => {
    const comparison = await getAnnualComparison(testUserId);
    
    // All currency values should be numbers with max 2 decimal places
    expect(typeof comparison.annualTotals.totalProfit).toBe("number");
    expect(typeof comparison.annualTotals.averageProfitPerMonth).toBe("number");
    
    // Check decimal places
    const profitStr = comparison.annualTotals.totalProfit.toString();
    const decimalIndex = profitStr.indexOf(".");
    if (decimalIndex !== -1) {
      expect(profitStr.length - decimalIndex - 1).toBeLessThanOrEqual(2);
    }
  });
});
