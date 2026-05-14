/**
 * distance-resolver.test.ts
 * 
 * Comprehensive tests for canonical distance resolution
 * Ensures all distance field combinations are handled correctly
 */

import { describe, it, expect } from "vitest";
import { resolveLoadDistance } from "./distance-resolver";

describe("resolveLoadDistance", () => {
  describe("Priority: load.miles takes precedence", () => {
    it("should use load.miles when valid", () => {
      const load = {
        id: 840001,
        miles: 204.73,
        totalMiles: undefined,
        distanceMiles: undefined,
        estimatedMiles: undefined,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(204.73);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
      expect(result.hasValidCoordinates).toBe(true);
    });

    it("should use load.miles and ignore other distance fields", () => {
      const load = {
        id: 810001,
        miles: 89.15,
        totalMiles: 100, // Should be ignored
        distanceMiles: 110, // Should be ignored
        estimatedMiles: 120, // Should be ignored
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(89.15);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });

    it("should fallback to totalMiles if miles is missing", () => {
      const load = {
        id: 780002,
        miles: undefined,
        totalMiles: 86.12,
        distanceMiles: undefined,
        estimatedMiles: undefined,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(86.12);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });

    it("should fallback to distanceMiles if miles and totalMiles are missing", () => {
      const load = {
        id: 750001,
        miles: undefined,
        totalMiles: undefined,
        distanceMiles: 75.5,
        estimatedMiles: undefined,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(75.5);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });

    it("should fallback to estimatedMiles if all explicit fields are missing", () => {
      const load = {
        id: 720001,
        miles: undefined,
        totalMiles: undefined,
        distanceMiles: undefined,
        estimatedMiles: 72.3,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(72.3);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });
  });

  describe("Fallback 120 with missing coordinates", () => {
    it("should return fallback 120 when no valid miles and no coordinates", () => {
      const load = {
        id: 500001,
        miles: undefined,
        totalMiles: undefined,
        distanceMiles: undefined,
        estimatedMiles: undefined,
        pickupLat: null,
        pickupLng: null,
        deliveryLat: null,
        deliveryLng: null,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
      expect(result.isReliable).toBe(false);
      expect(result.hasValidCoordinates).toBe(false);
    });

    it("should return fallback 120 when miles is 0 and no coordinates", () => {
      const load = {
        id: 510001,
        miles: 0,
        totalMiles: 0,
        distanceMiles: 0,
        estimatedMiles: 0,
        pickupLat: null,
        pickupLng: null,
        deliveryLat: null,
        deliveryLng: null,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
      expect(result.isReliable).toBe(false);
    });

    it("should return fallback 120 when miles is NaN and no coordinates", () => {
      const load = {
        id: 520001,
        miles: NaN,
        pickupLat: null,
        pickupLng: null,
        deliveryLat: null,
        deliveryLng: null,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
      expect(result.isReliable).toBe(false);
    });

    it("should return fallback 120 when miles is negative", () => {
      const load = {
        id: 530001,
        miles: -50,
        pickupLat: null,
        pickupLng: null,
        deliveryLat: null,
        deliveryLng: null,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
      expect(result.isReliable).toBe(false);
    });
  });

  describe("Coordinate validation", () => {
    it("should detect valid coordinates", () => {
      const load = {
        id: 600001,
        miles: 100,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.hasValidCoordinates).toBe(true);
    });

    it("should reject coordinates with zero values", () => {
      const load = {
        id: 610001,
        miles: undefined,
        pickupLat: 0,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.hasValidCoordinates).toBe(false);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
    });

    it("should reject coordinates with null values", () => {
      const load = {
        id: 620001,
        miles: undefined,
        pickupLat: null,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.hasValidCoordinates).toBe(false);
      expect(result.miles).toBe(120);
    });

    it("should reject coordinates with NaN values", () => {
      const load = {
        id: 630001,
        miles: undefined,
        pickupLat: NaN,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.hasValidCoordinates).toBe(false);
      expect(result.miles).toBe(120);
    });

    it("should reject partial coordinates (missing delivery)", () => {
      const load = {
        id: 640001,
        miles: undefined,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: null,
        deliveryLng: null,
      };

      const result = resolveLoadDistance(load);
      expect(result.hasValidCoordinates).toBe(false);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
    });
  });

  describe("Edge cases", () => {
    it("should handle load with only miles field", () => {
      const load = { id: 700001, miles: 150 };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(150);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });

    it("should handle empty load object", () => {
      const load = {};

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
      expect(result.isReliable).toBe(false);
    });

    it("should handle load with string distance values", () => {
      const load = {
        id: 710001,
        miles: "95.5",
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(95.5);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });

    it("should handle very large distance values", () => {
      const load = {
        id: 800001,
        miles: 3000,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(3000);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });

    it("should handle very small distance values", () => {
      const load = {
        id: 810001,
        miles: 0.5,
        pickupLat: 40.7623631,
        pickupLng: -73.8313916,
        deliveryLat: 41.2033216,
        deliveryLng: -77.1945247,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(0.5);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });
  });

  describe("Real-world load examples", () => {
    it("should handle load 840001 (valid miles)", () => {
      const load = {
        id: 840001,
        status: "available",
        price: "800.00",
        estimatedFuel: "140.32",
        estimatedTolls: "0.00",
        netMargin: "659.68",
        estimatedMiles: undefined,
        miles: 204.73869731793562,
        totalMiles: undefined,
        distanceMiles: undefined,
        pickupLat: "40.7623631",
        pickupLng: "-73.8313916",
        deliveryLat: "41.2033216",
        deliveryLng: "-77.1945247",
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBeCloseTo(204.74, 1);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
      expect(result.hasValidCoordinates).toBe(true);
    });

    it("should handle load 810001 (valid miles)", () => {
      const load = {
        id: 810001,
        status: "available",
        price: "599.97",
        miles: 89.15593221649034,
        totalMiles: undefined,
        distanceMiles: undefined,
        estimatedMiles: undefined,
        pickupLat: "40.7623631",
        pickupLng: "-73.8313916",
        deliveryLat: "41.2033216",
        deliveryLng: "-77.1945247",
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBeCloseTo(89.16, 1);
      expect(result.source).toBe("explicit");
      expect(result.isReliable).toBe(true);
    });

    it("should handle legacy null-coord load (fallback 120)", () => {
      const load = {
        id: 360001,
        status: "available",
        price: "425.00",
        miles: undefined,
        totalMiles: undefined,
        distanceMiles: undefined,
        estimatedMiles: undefined,
        pickupLat: null,
        pickupLng: null,
        deliveryLat: null,
        deliveryLng: null,
      };

      const result = resolveLoadDistance(load);
      expect(result.miles).toBe(120);
      expect(result.source).toBe("fallback_120");
      expect(result.isReliable).toBe(false);
      expect(result.hasValidCoordinates).toBe(false);
    });
  });
});
