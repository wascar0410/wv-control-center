import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getMonthlyProjections } from "./db-projections";
import { getDb } from "./db";
import { loadQuotations, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Monthly Projections", () => {
  let testUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const result = await db.insert(users).values({
      openId: `test-user-${Date.now()}`,
      name: "Test User",
      email: "test@example.com",
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

  it("should return zero projections when no quotations exist", async () => {
    const projections = await getMonthlyProjections(testUserId);
    
    expect(projections).toBeDefined();
    expect(projections.completedMiles).toBe(0);
    expect(projections.quotedMiles).toBe(0);
    expect(projections.totalMilesActual).toBe(0);
    expect(projections.completedProfit).toBe(0);
    expect(projections.quotedProfit).toBe(0);
  });

  it("should calculate completed quotations correctly", async () => {
    if (!db) throw new Error("Database not available");

    // Insert completed quotation
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
    });

    const projections = await getMonthlyProjections(testUserId);
    
    expect(projections.completedMiles).toBe(15);
    expect(projections.completedProfit).toBe(15);
    expect(projections.totalMilesActual).toBeGreaterThanOrEqual(15);
  });

  it("should calculate quoted quotations separately", async () => {
    if (!db) throw new Error("Database not available");

    // Insert quoted quotation
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
      status: "quoted",
    });

    const projections = await getMonthlyProjections(testUserId);
    
    expect(projections.quotedMiles).toBe(20);
    expect(projections.quotedProfit).toBe(18);
    expect(projections.totalMilesActual).toBeGreaterThanOrEqual(35);
  });

  it("should calculate daily averages correctly", async () => {
    const projections = await getMonthlyProjections(testUserId);
    
    // Daily average should be based on completed miles divided by days passed
    if (projections.daysPassed > 0) {
      const expectedDailyMiles = Math.round(projections.completedMiles / projections.daysPassed);
      expect(projections.dailyAverageMiles).toBe(expectedDailyMiles);
    }
  });

  it("should project total miles correctly", async () => {
    const projections = await getMonthlyProjections(testUserId);
    
    // Projected miles should be completed + (daily average * remaining days)
    // Allow for small rounding differences (within 1 mile)
    const expectedProjection = Math.round(
      projections.completedMiles + (projections.dailyAverageMiles * projections.daysRemaining)
    );
    expect(Math.abs(projections.projectedTotalMiles - expectedProjection)).toBeLessThanOrEqual(1);
  });

  it("should determine if goal will be reached", async () => {
    const projections = await getMonthlyProjections(testUserId);
    
    // Goal is 4000 miles
    const goalReached = projections.projectedTotalMiles >= 4000;
    expect(projections.willReachGoal).toBe(goalReached);
  });

  it("should calculate miles percentage correctly", async () => {
    const projections = await getMonthlyProjections(testUserId);
    
    const expectedPercentage = Math.round((projections.projectedTotalMiles / 4000) * 100);
    expect(projections.milesPercentage).toBe(expectedPercentage);
  });

  it("should return proper date metrics", async () => {
    const projections = await getMonthlyProjections(testUserId);
    
    expect(projections.daysPassed).toBeGreaterThan(0);
    expect(projections.daysRemaining).toBeGreaterThanOrEqual(0);
    expect(projections.daysInMonth).toBeGreaterThan(0);
    expect(projections.daysPassed + projections.daysRemaining).toBe(projections.daysInMonth);
  });

  it("should format currency values correctly", async () => {
    const projections = await getMonthlyProjections(testUserId);
    
    // All currency values should be numbers with max 2 decimal places
    expect(typeof projections.completedProfit).toBe("number");
    expect(typeof projections.projectedTotalProfit).toBe("number");
    expect(typeof projections.dailyAverageProfit).toBe("number");
    
    // Check decimal places
    const profitStr = projections.completedProfit.toString();
    const decimalIndex = profitStr.indexOf(".");
    if (decimalIndex !== -1) {
      expect(profitStr.length - decimalIndex - 1).toBeLessThanOrEqual(2);
    }
  });
});
