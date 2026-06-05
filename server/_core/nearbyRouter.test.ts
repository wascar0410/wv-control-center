import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { nearbyRouter } from "./nearbyRouter";
import { users as usersTable } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("nearbyRouter", () => {
  let db: any;
  let testOwnerId: number;
  let testDriver1Id: number;
  let testDriver2Id: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create test owner
    const ownerResult = await db
      .insert(usersTable)
      .values({
        email: `test-owner-${Date.now()}@test.local`,
        name: "Test Owner",
        role: "owner",
        passwordHash: "test",
      })
      .returning();
    testOwnerId = ownerResult[0]?.id;

    // Create test driver 1 with GPS location
    const driver1Result = await db
      .insert(usersTable)
      .values({
        email: `test-driver-1-${Date.now()}@test.local`,
        name: "Test Driver 1",
        role: "driver",
        passwordHash: "test",
        currentLat: 40.7580,
        currentLng: -73.9855,
        lastLocationUpdate: new Date(),
        vehicleInfo: JSON.stringify({
          vehicleType: "Truck",
          vehicleName: "Truck 1",
          vehiclePlate: "ABC123",
          availableForLoads: true,
        }),
      })
      .returning();
    testDriver1Id = driver1Result[0]?.id;

    // Create test driver 2 without GPS location
    const driver2Result = await db
      .insert(usersTable)
      .values({
        email: `test-driver-2-${Date.now()}@test.local`,
        name: "Test Driver 2",
        role: "driver",
        passwordHash: "test",
        vehicleInfo: JSON.stringify({
          vehicleType: "Van",
          vehicleName: "Van 1",
          vehiclePlate: "XYZ789",
          availableForLoads: false,
        }),
      })
      .returning();
    testDriver2Id = driver2Result[0]?.id;
  });

  afterAll(async () => {
    if (!db) return;
    // Clean up test data
    await db.delete(usersTable).where(eq(usersTable.id, testOwnerId));
    await db.delete(usersTable).where(eq(usersTable.id, testDriver1Id));
    await db.delete(usersTable).where(eq(usersTable.id, testDriver2Id));
  });

  it("should return nearby drivers sorted by GPS status and distance", async () => {
    const caller = nearbyRouter.createCaller({
      user: { id: testOwnerId, role: "owner", email: "owner@test.local" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.getDrivers({
      loadId: 1,
      pickupLat: 40.7580,
      pickupLng: -73.9855,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Find our test drivers in the result
    const driver1 = result.find((d: any) => d.id === testDriver1Id);
    const driver2 = result.find((d: any) => d.id === testDriver2Id);

    // Driver 1 should be before Driver 2 (has GPS)
    if (driver1 && driver2) {
      const driver1Index = result.indexOf(driver1);
      const driver2Index = result.indexOf(driver2);
      expect(driver1Index).toBeLessThan(driver2Index);
    }

    // Check driver 1 data
    if (driver1) {
      expect(driver1.name).toBe("Test Driver 1");
      expect(driver1.hasGps).toBe(true);
      expect(driver1.availableForLoads).toBe(true);
      expect(driver1.vehicleType).toBe("Truck");
      expect(driver1.vehiclePlate).toBe("ABC123");
    }

    // Check driver 2 data
    if (driver2) {
      expect(driver2.name).toBe("Test Driver 2");
      expect(driver2.hasGps).toBe(false);
      expect(driver2.availableForLoads).toBe(false);
      expect(driver2.vehicleType).toBe("Van");
      expect(driver2.vehiclePlate).toBe("XYZ789");
    }
  });

  it("should reject non-owner/admin users", async () => {
    const caller = nearbyRouter.createCaller({
      user: { id: testDriver1Id, role: "driver", email: "driver@test.local" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.getDrivers({
        loadId: 1,
        pickupLat: 40.7580,
        pickupLng: -73.9855,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("No autorizado");
    }
  });

  it("should calculate distance correctly", async () => {
    const caller = nearbyRouter.createCaller({
      user: { id: testOwnerId, role: "owner", email: "owner@test.local" },
      req: {} as any,
      res: {} as any,
    });

    // Use pickup location same as driver 1
    const result = await caller.getDrivers({
      loadId: 1,
      pickupLat: 40.7580,
      pickupLng: -73.9855,
    });

    const driver1 = result.find((d: any) => d.id === testDriver1Id);
    if (driver1) {
      // Distance should be very small (same location)
      expect(driver1.distance).toBeLessThan(1);
    }
  });
});
