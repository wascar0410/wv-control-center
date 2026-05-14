import { describe, it, expect } from "vitest";
import { analyzeLoadAdvanced } from "../client/src/utils/load-advisor";

describe("AI Advisor Blocking Logic", () => {
  it("should BLOCK loads with null coordinates", () => {
    const load = {
      id: 510001,
      price: 425,
      miles: 120,
      pickupLat: null,
      pickupLng: null,
      deliveryLat: null,
      deliveryLng: null,
      estimatedFuel: 50,
      estimatedTolls: 0,
      vehicleType: "cargo_van",
    };

    const result = analyzeLoadAdvanced(load);

    expect(result.recommendation).toBe("REJECT");
    expect(result.confidence).toBe("low");
    expect(result.block).toBe(true);
    expect(result.riskFlags).toContain("NO_COORDS");
    expect(result.riskFlags).toContain("FALLBACK_DISTANCE");
    expect(result.reasoning).toContain("BLOCKED");
  });

  it("should BLOCK loads with undefined coordinates", () => {
    const load = {
      id: 360001,
      price: 425,
      miles: 120,
      pickupLat: undefined,
      pickupLng: undefined,
      deliveryLat: undefined,
      deliveryLng: undefined,
      estimatedFuel: 50,
      estimatedTolls: 0,
      vehicleType: "cargo_van",
    };

    const result = analyzeLoadAdvanced(load);

    expect(result.recommendation).toBe("REJECT");
    expect(result.confidence).toBe("low");
    expect(result.block).toBe(true);
  });

  it("should BLOCK loads with zero coordinates", () => {
    const load = {
      id: 360002,
      price: 425,
      miles: 120,
      pickupLat: 0,
      pickupLng: 0,
      deliveryLat: 0,
      deliveryLng: 0,
      estimatedFuel: 50,
      estimatedTolls: 0,
      vehicleType: "cargo_van",
    };

    const result = analyzeLoadAdvanced(load);

    expect(result.recommendation).toBe("REJECT");
    expect(result.confidence).toBe("low");
    expect(result.block).toBe(true);
  });

  it("should BLOCK loads with partial coordinates", () => {
    const load = {
      id: 390001,
      price: 425,
      miles: 120,
      pickupLat: 40.7128,
      pickupLng: null,
      deliveryLat: 34.0522,
      deliveryLng: null,
      estimatedFuel: 50,
      estimatedTolls: 0,
      vehicleType: "cargo_van",
    };

    const result = analyzeLoadAdvanced(load);

    expect(result.recommendation).toBe("REJECT");
    expect(result.confidence).toBe("low");
    expect(result.block).toBe(true);
  });

  it("should ACCEPT loads with valid coordinates and good profit", () => {
    const load = {
      id: 750001,
      price: 425,
      miles: 150,
      pickupLat: 40.7128,
      pickupLng: -74.0060,
      deliveryLat: 34.0522,
      deliveryLng: -118.2437,
      estimatedFuel: 50,
      estimatedTolls: 0,
      vehicleType: "cargo_van",
    };

    const result = analyzeLoadAdvanced(load);

    // Should NOT be blocked
    expect(result.block).not.toBe(true);
    // Should have valid miles (not 120 fallback)
    expect(result.miles).toBeGreaterThan(120);
    // Should have positive profit
    expect(result.profit).toBeGreaterThan(0);
  });
});
