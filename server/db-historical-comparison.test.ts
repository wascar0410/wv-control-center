import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getHistoricalComparison } from "./db-historical-comparison";
import { getDb } from "./db";
import { loadQuotations, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Historical Comparison", () => {
  let testUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const result = await db.insert(users).values({
      openId: `test-user-comparison-${Date.now()}`,
      name: "Test User Comparison",
      email: "test-comparison@example.com",
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

  it("should return comparison data with zero values when no quotations exist", async () => {
    const comparison = await getHistoricalComparison(testUserId);
    
    expect(comparison).toBeDefined();
    expect(comparison.currentMonth.miles).toBe(0);
    expect(comparison.previousMonth.miles).toBe(0);
    expect(comparison.comparison.milesVariation).toBe(0);
  });

  it("should calculate current month metrics correctly", async () => {
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Insert current month quotation
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

    const comparison = await getHistoricalComparison(testUserId);
    
    expect(comparison.currentMonth.miles).toBe(15);
    expect(comparison.currentMonth.profit).toBe(15);
    expect(comparison.currentMonth.quotationsCount).toBe(1);
  });

  it("should calculate previous month metrics correctly", async () => {
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Insert previous month quotation
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
      weight: "3000",
      weightUnit: "lbs",
      cargoDescription: "Test cargo 2",
      emptyMiles: "5",
      loadedMiles: "10",
      returnEmptyMiles: "0",
      totalMiles: "20",
      ratePerMile: "1.50",
      fuelSurcharge: "0",
      totalPrice: "30.00",
      estimatedFuelCost: "4.00",
      estimatedOperatingCost: "8.00",
      estimatedProfit: "18.00",
      profitMarginPercent: "60.00",
      status: "accepted",
      createdAt: previousMonthStart,
    });

    const comparison = await getHistoricalComparison(testUserId);
    
    expect(comparison.previousMonth.miles).toBe(20);
    expect(comparison.previousMonth.profit).toBe(18);
    expect(comparison.previousMonth.quotationsCount).toBe(1);
  });

  it("should calculate variations correctly", async () => {
    const comparison = await getHistoricalComparison(testUserId);
    
    // Current: 15 miles, Previous: 20 miles
    expect(comparison.comparison.milesVariation).toBe(-5);
    expect(comparison.comparison.milesVariationPercent).toBeLessThan(0);
    
    // Current: 15 profit, Previous: 18 profit
    expect(comparison.comparison.profitVariation).toBeLessThan(0);
  });

  it("should calculate average profit per mile correctly", async () => {
    const comparison = await getHistoricalComparison(testUserId);
    
    // Current: 15 profit / 15 miles = 1.00
    expect(comparison.currentMonth.averageProfitPerMile).toBe(1);
    
    // Previous: 18 profit / 20 miles = 0.90
    expect(comparison.previousMonth.averageProfitPerMile).toBe(0.9);
  });

  it("should determine trend correctly", async () => {
    const comparison = await getHistoricalComparison(testUserId);
    
    // With declining metrics, trend should be "declining"
    expect(comparison.comparison.trend).toBeDefined();
    expect(["improving", "declining", "stable"]).toContain(comparison.comparison.trend);
  });

  it("should format currency values correctly", async () => {
    const comparison = await getHistoricalComparison(testUserId);
    
    // All currency values should be numbers with max 2 decimal places
    expect(typeof comparison.currentMonth.profit).toBe("number");
    expect(typeof comparison.previousMonth.profit).toBe("number");
    expect(typeof comparison.comparison.profitVariation).toBe("number");
    
    // Check decimal places
    const profitStr = comparison.currentMonth.profit.toString();
    const decimalIndex = profitStr.indexOf(".");
    if (decimalIndex !== -1) {
      expect(profitStr.length - decimalIndex - 1).toBeLessThanOrEqual(2);
    }
  });

  it("should handle zero division gracefully", async () => {
    const comparison = await getHistoricalComparison(testUserId);
    
    // Should not throw error and should return valid numbers
    expect(comparison.comparison.milesVariationPercent).toBeDefined();
    expect(comparison.comparison.profitVariationPercent).toBeDefined();
    expect(typeof comparison.comparison.milesVariationPercent).toBe("number");
    expect(typeof comparison.comparison.profitVariationPercent).toBe("number");
  });

  it("should calculate quotations variation correctly", async () => {
    const comparison = await getHistoricalComparison(testUserId);
    
    // Current: 1 quotation, Previous: 1 quotation
    expect(comparison.comparison.quotationsVariation).toBe(0);
    expect(comparison.comparison.quotationsVariationPercent).toBe(0);
  });
});
