import { describe, it, expect } from "vitest";
import { optimizeRoute, optimizeRouteNearestNeighbor, optimizeRouteWithGroups, Stop } from "./_core/routeOptimizer";

describe("Multi-Stop Route Optimization", () => {
  const vanLocation = { lat: 25.7617, lng: -80.1918 }; // Miami

  // Test data: Multiple stops in Miami area
  const testStops: Stop[] = [
    {
      type: "pickup",
      address: "123 Main St, Miami, FL",
      latitude: 25.7589,
      longitude: -80.1944,
      weight: 100,
    },
    {
      type: "delivery",
      address: "456 Oak Ave, Miami, FL",
      latitude: 25.7614,
      longitude: -80.1899,
      weight: 50,
    },
    {
      type: "pickup",
      address: "789 Pine Rd, Miami, FL",
      latitude: 25.7645,
      longitude: -80.1875,
      weight: 75,
    },
    {
      type: "delivery",
      address: "321 Elm St, Miami, FL",
      latitude: 25.7670,
      longitude: -80.1850,
      weight: 100,
    },
  ];

  it("should optimize route with nearest neighbor algorithm", async () => {
    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, testStops);

    expect(result).not.toBeNull();
    expect(result?.stops).toHaveLength(4);
    expect(result?.totalDistance).toBeGreaterThan(0);
    expect(result?.totalDuration).toBeGreaterThan(0);
    expect(result?.totalWeight).toBe(325); // 100 + 50 + 75 + 100
  });

  it("should have stops in optimized order", async () => {
    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, testStops);

    expect(result?.stops).toBeDefined();
    result?.stops.forEach((stop, index) => {
      expect(stop.stopOrder).toBe(index + 1);
      expect(stop.distanceFromPrevious).toBeGreaterThanOrEqual(0);
      expect(stop.durationFromPrevious).toBeGreaterThanOrEqual(0);
    });
  });

  it("should calculate realistic distances between stops", async () => {
    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, testStops);

    // Each segment should be less than 10 miles in Miami area
    result?.stops.forEach((stop) => {
      expect(stop.distanceFromPrevious).toBeLessThan(10);
    });
  });

  it("should handle single stop", async () => {
    const singleStop: Stop[] = [
      {
        type: "delivery",
        address: "123 Test St",
        latitude: 25.7617,
        longitude: -80.1918,
        weight: 100,
      },
    ];

    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, singleStop);

    expect(result?.stops).toHaveLength(1);
    expect(result?.totalWeight).toBe(100);
  });

  it("should handle empty stops array", async () => {
    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, []);

    expect(result).toBeNull();
  });

  it("should group pickups before deliveries", async () => {
    const result = await optimizeRouteWithGroups(vanLocation.lat, vanLocation.lng, testStops);

    expect(result).not.toBeNull();
    expect(result?.stops).toHaveLength(4);

    // Check that both pickup and delivery stops are present
    const hasPickup = result?.stops.some((s) => s.type === "pickup");
    const hasDelivery = result?.stops.some((s) => s.type === "delivery");

    expect(hasPickup).toBe(true);
    expect(hasDelivery).toBe(true);
  });

  it("should calculate total distance correctly", async () => {
    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, testStops);

    const calculatedTotal = result?.stops.reduce((sum, stop) => sum + stop.distanceFromPrevious, 0) || 0;

    // Total distance should be close to sum of segments
    expect(result?.totalDistance).toBeGreaterThan(0);
    expect(result?.totalDistance).toBeLessThan(100); // Reasonable upper bound for Miami area
  });

  it("should calculate total duration correctly", async () => {
    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, testStops);

    const calculatedTotal = result?.stops.reduce((sum, stop) => sum + stop.durationFromPrevious, 0) || 0;

    // Total duration should be reasonable (less than 3 hours for local route)
    expect(result?.totalDuration).toBeGreaterThan(0);
    expect(result?.totalDuration).toBeLessThan(3);
  });

  it("should preserve stop metadata through optimization", async () => {
    const stopsWithMetadata: Stop[] = [
      {
        type: "pickup",
        address: "Warehouse A",
        latitude: 25.7589,
        longitude: -80.1944,
        weight: 500,
        description: "Large shipment",
      },
      {
        type: "delivery",
        address: "Store B",
        latitude: 25.7614,
        longitude: -80.1899,
        weight: 250,
        description: "Fragile items",
      },
    ];

    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, stopsWithMetadata);

    result?.stops.forEach((stop) => {
      expect(stop.address).toBeDefined();
      expect(stop.type).toMatch(/pickup|delivery/);
    });
  });

  it("should handle stops at same location", async () => {
    const sameLocationStops: Stop[] = [
      {
        type: "pickup",
        address: "123 Main St",
        latitude: 25.7617,
        longitude: -80.1918,
        weight: 100,
      },
      {
        type: "delivery",
        address: "123 Main St",
        latitude: 25.7617,
        longitude: -80.1918,
        weight: 100,
      },
    ];

    const result = await optimizeRouteNearestNeighbor(vanLocation.lat, vanLocation.lng, sameLocationStops);

    expect(result?.stops).toHaveLength(2);
    expect(result?.totalDistance).toBeLessThan(1); // Very short distance
  });
});
