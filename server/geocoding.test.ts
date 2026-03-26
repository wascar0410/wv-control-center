import { describe, it, expect } from "vitest";
import { validateCoordinates, calculateDistanceFromCoordinates } from "./_core/geocoding";

describe("Geocoding Utilities", () => {
  it("should validate correct coordinates", () => {
    expect(validateCoordinates(25.7617, -80.1918)).toBe(true);
    expect(validateCoordinates(0, 0)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
    expect(validateCoordinates(90, 180)).toBe(true);
  });

  it("should reject invalid latitude", () => {
    expect(validateCoordinates(91, 0)).toBe(false);
    expect(validateCoordinates(-91, 0)).toBe(false);
    expect(validateCoordinates(100, 50)).toBe(false);
  });

  it("should reject invalid longitude", () => {
    expect(validateCoordinates(0, 181)).toBe(false);
    expect(validateCoordinates(0, -181)).toBe(false);
    expect(validateCoordinates(45, 200)).toBe(false);
  });

  it("should calculate distance between Miami and Tampa", () => {
    // Miami: 25.7617, -80.1918
    // Tampa: 27.9506, -82.4572
    const distance = calculateDistanceFromCoordinates(25.7617, -80.1918, 27.9506, -82.4572);
    
    // Distance should be approximately 200-250 miles
    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(250);
  });

  it("should calculate distance between Miami and Jacksonville", () => {
    // Miami: 25.7617, -80.1918
    // Jacksonville: 30.3322, -81.6557
    const distance = calculateDistanceFromCoordinates(25.7617, -80.1918, 30.3322, -81.6557);
    
    // Distance should be approximately 320-380 miles
    expect(distance).toBeGreaterThan(320);
    expect(distance).toBeLessThan(380);
  });

  it("should calculate zero distance for same coordinates", () => {
    const distance = calculateDistanceFromCoordinates(25.7617, -80.1918, 25.7617, -80.1918);
    
    expect(distance).toBeLessThan(0.1);
  });

  it("should calculate distance symmetrically", () => {
    const distance1 = calculateDistanceFromCoordinates(25.7617, -80.1918, 27.9506, -82.4572);
    const distance2 = calculateDistanceFromCoordinates(27.9506, -82.4572, 25.7617, -80.1918);
    
    expect(Math.abs(distance1 - distance2)).toBeLessThan(0.01);
  });

  it("should calculate distance across equator", () => {
    // New York: 40.7128, -74.0060
    // Sydney: -33.8688, 151.2093
    const distance = calculateDistanceFromCoordinates(40.7128, -74.0060, -33.8688, 151.2093);
    
    // Distance should be approximately 9,950 miles
    expect(distance).toBeGreaterThan(9900);
    expect(distance).toBeLessThan(10000);
  });

  it("should handle coordinates at poles", () => {
    const distance = calculateDistanceFromCoordinates(90, 0, -90, 0);
    
    // Distance from North Pole to South Pole is approximately 12,450 miles
    expect(distance).toBeGreaterThan(12400);
    expect(distance).toBeLessThan(12500);
  });

  it("should calculate short distances accurately", () => {
    // Two points very close together (approximately 1 mile apart)
    // Using approximate coordinates for testing
    const distance = calculateDistanceFromCoordinates(25.7617, -80.1918, 25.7627, -80.1908);
    
    // Should be less than 2 miles
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(2);
  });

  it("should calculate distance for round trip", () => {
    const lat1 = 25.7617;
    const lng1 = -80.1918;
    const lat2 = 27.9506;
    const lng2 = -82.4572;
    
    const distance1 = calculateDistanceFromCoordinates(lat1, lng1, lat2, lng2);
    const distance2 = calculateDistanceFromCoordinates(lat2, lng2, lat1, lng1);
    
    const totalDistance = distance1 + distance2;
    
    // Total should be approximately 400-500 miles for round trip
    expect(totalDistance).toBeGreaterThan(400);
    expect(totalDistance).toBeLessThan(500);
  });
});
