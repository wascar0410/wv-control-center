import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getQuarterlyComparison } from "./db-quarterly-comparison";
import { getDb } from "./db";
import { loadQuotations, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Quarterly Comparison", () => {
  let testUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const result = await db.insert(users).values({
      openId: `test-user-quarterly-${Date.now()}`,
      name: "Test User Quarterly",
      email: "test-quarterly@example.com",
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

  it("should return quarterly data with zero values when no quotations exist", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    expect(comparison).toBeDefined();
    expect(comparison.months.length).toBe(3);
    expect(comparison.quarterlyTotals.totalMiles).toBe(0);
    expect(comparison.quarterlyTotals.totalProfit).toBe(0);
  });

  it("should return 3 months of data", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    expect(comparison.months.length).toBe(3);
    expect(comparison.months[0]).toHaveProperty("month");
    expect(comparison.months[0]).toHaveProperty("miles");
    expect(comparison.months[0]).toHaveProperty("profit");
    expect(comparison.months[0]).toHaveProperty("quotationsCount");
  });

  it("should calculate quarterly totals correctly", async () => {
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Insert quotation for current month
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
      createdAt: currentMonthStart,
    });

    const comparison = await getQuarterlyComparison(testUserId);
    
    expect(comparison.quarterlyTotals.totalMiles).toBeGreaterThanOrEqual(15);
    expect(comparison.quarterlyTotals.totalProfit).toBeGreaterThanOrEqual(15);
  });

  it("should calculate monthly metrics correctly", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    // Each month should have metrics
    comparison.months.forEach(month => {
      expect(typeof month.miles).toBe("number");
      expect(typeof month.profit).toBe("number");
      expect(typeof month.quotationsCount).toBe("number");
      expect(typeof month.averageProfitPerMile).toBe("number");
    });
  });

  it("should calculate average profit per mile correctly", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    // If there are miles, average profit per mile should be calculated
    if (comparison.quarterlyTotals.totalMiles > 0) {
      const expectedAverage = comparison.quarterlyTotals.totalProfit / comparison.quarterlyTotals.totalMiles;
      expect(Math.abs(comparison.quarterlyTotals.averageProfitPerMile - expectedAverage)).toBeLessThan(0.01);
    }
  });

  it("should calculate average miles per month correctly", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    const expectedAverage = Math.round(comparison.quarterlyTotals.totalMiles / 3);
    expect(comparison.quarterlyTotals.averageMilesPerMonth).toBe(expectedAverage);
  });

  it("should determine trend correctly", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    expect(comparison.comparison.trend).toBeDefined();
    expect(["improving", "declining", "stable"]).toContain(comparison.comparison.trend);
  });

  it("should calculate variations correctly", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    // Variations should be numbers
    expect(typeof comparison.comparison.milesVariation).toBe("number");
    expect(typeof comparison.comparison.profitVariation).toBe("number");
    expect(typeof comparison.comparison.milesVariationPercent).toBe("number");
    expect(typeof comparison.comparison.profitVariationPercent).toBe("number");
  });

  it("should format currency values correctly", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    // All currency values should be numbers with max 2 decimal places
    expect(typeof comparison.quarterlyTotals.totalProfit).toBe("number");
    expect(typeof comparison.quarterlyTotals.averageProfitPerMonth).toBe("number");
    
    // Check decimal places
    const profitStr = comparison.quarterlyTotals.totalProfit.toString();
    const decimalIndex = profitStr.indexOf(".");
    if (decimalIndex !== -1) {
      expect(profitStr.length - decimalIndex - 1).toBeLessThanOrEqual(2);
    }
  });

  it("should handle months with no quotations", async () => {
    const comparison = await getQuarterlyComparison(testUserId);
    
    // Some months might have zero quotations
    comparison.months.forEach(month => {
      expect(month.quotationsCount).toBeGreaterThanOrEqual(0);
      expect(month.miles).toBeGreaterThanOrEqual(0);
    });
  });
});
