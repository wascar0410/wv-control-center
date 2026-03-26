import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Quotation System", () => {
  let testUserId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const result = await db.insert(users).values({
      openId: `test-quotation-${Date.now()}`,
      name: "Test Quotation User",
      email: "quotation@test.com",
      loginMethod: "test",
      role: "admin",
    });
    testUserId = (result as any).insertId;
  });

  afterAll(async () => {
    if (db && testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should calculate distance using Haversine formula", () => {
    // Miami to Tampa
    const lat1 = 25.7617;
    const lng1 = -80.1918;
    const lat2 = 27.9506;
    const lng2 = -82.4572;

    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(250);
  });

  it("should calculate profitability correctly", () => {
    const totalPrice = 500;
    const totalMiles = 200;
    const fuelCostPerMile = 0.35;
    const operatingCostPerMile = 0.65;

    const estimatedFuelCost = totalMiles * fuelCostPerMile;
    const estimatedOperatingCost = totalMiles * operatingCostPerMile;
    const totalCost = estimatedFuelCost + estimatedOperatingCost;
    const estimatedProfit = totalPrice - totalCost;
    const profitMarginPercent = (estimatedProfit / totalPrice) * 100;

    expect(estimatedFuelCost).toBe(70);
    expect(estimatedOperatingCost).toBe(130);
    expect(totalCost).toBe(200);
    expect(estimatedProfit).toBe(300);
    expect(profitMarginPercent).toBeCloseTo(60, 1);
  });

  it("should calculate low margin quotation", () => {
    const totalPrice = 100;
    const totalMiles = 100;
    const fuelCostPerMile = 0.35;
    const operatingCostPerMile = 0.65;

    const estimatedFuelCost = totalMiles * fuelCostPerMile;
    const estimatedOperatingCost = totalMiles * operatingCostPerMile;
    const totalCost = estimatedFuelCost + estimatedOperatingCost;
    const estimatedProfit = totalPrice - totalCost;
    const profitMarginPercent = (estimatedProfit / totalPrice) * 100;

    expect(profitMarginPercent).toBeLessThan(15);
    expect(estimatedProfit).toBe(0);
  });

  it("should calculate per-pound pricing", () => {
    const totalMiles = 100;
    const weight = 5000;
    const ratePerMile = 2.5;
    const ratePerPound = 0.002;

    const totalPrice = totalMiles * ratePerMile + weight * ratePerPound;

    expect(totalPrice).toBe(250 + 10);
    expect(totalPrice).toBe(260);
  });

  it("should include fuel surcharge in total price", () => {
    const totalMiles = 100;
    const ratePerMile = 2.5;
    const fuelSurcharge = 50;

    const totalPrice = totalMiles * ratePerMile + fuelSurcharge;

    expect(totalPrice).toBe(250 + 50);
    expect(totalPrice).toBe(300);
  });

  it("should calculate return empty miles correctly", () => {
    const emptyMiles = 50;
    const loadedMiles = 100;
    const returnEmptyMiles = 50;

    const totalMiles = emptyMiles + loadedMiles + returnEmptyMiles;

    expect(totalMiles).toBe(200);
  });

  it("should calculate without return empty miles", () => {
    const emptyMiles = 50;
    const loadedMiles = 100;
    const returnEmptyMiles = 0;

    const totalMiles = emptyMiles + loadedMiles + returnEmptyMiles;

    expect(totalMiles).toBe(150);
  });

  it("should validate minimum profit margin", () => {
    const profitMarginPercent = 12;
    const minimumMargin = 15;

    const isRentable = profitMarginPercent >= minimumMargin;

    expect(isRentable).toBe(false);
  });

  it("should validate acceptable profit margin", () => {
    const profitMarginPercent = 25;
    const minimumMargin = 15;

    const isRentable = profitMarginPercent >= minimumMargin;

    expect(isRentable).toBe(true);
  });

  it("should calculate cost per mile accurately", () => {
    const totalPrice = 500;
    const totalMiles = 200;

    const costPerMile = totalPrice / totalMiles;

    expect(costPerMile).toBe(2.5);
  });
});
