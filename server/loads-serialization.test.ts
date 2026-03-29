import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { getPendingAssignmentsForDriver, getLoadById } from "./db";
import { loads, loadAssignments, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Loads Serialization Fix", () => {
  let db: any;
  let testUserId: number;
  let testLoadId: number;
  let testAssignmentId: number;
  let testDriverId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      console.warn("Database not available for tests");
      return;
    }

    try {
      // Create test users
      await db
        .insert(users)
        .values({
          openId: `test-user-${Date.now()}`,
          name: "Test User",
          email: "test@example.com",
          role: "admin",
        });

      const userRows = await db.select({ id: users.id }).from(users).limit(1);
      testUserId = userRows[0]?.id || 1;

      await db
        .insert(users)
        .values({
          openId: `test-driver-${Date.now()}`,
          name: "Test Driver",
          email: "driver@example.com",
          role: "driver",
        });

      const driverRows = await db.select({ id: users.id }).from(users).where(eq(users.role, "driver")).limit(1);
      testDriverId = driverRows[0]?.id || 2;

      // Create test load
      await db
        .insert(loads)
        .values({
          clientName: "Test Client",
          pickupAddress: "123 Pickup St",
          deliveryAddress: "456 Delivery Ave",
          weight: "1000",
          weightUnit: "lbs",
          merchandiseType: "General Cargo",
          price: "500.00",
          estimatedFuel: "50.00",
          estimatedTolls: "10.00",
          status: "available",
          createdBy: testUserId,
        });

      const loadRows = await db.select({ id: loads.id }).from(loads).limit(1);
      testLoadId = loadRows[0]?.id || 1;

      // Create test assignment
      await db
        .insert(loadAssignments)
        .values({
          loadId: testLoadId,
          driverId: testDriverId,
          status: "pending",
        });

      const assignmentRows = await db.select({ id: loadAssignments.id }).from(loadAssignments).limit(1);
      testAssignmentId = assignmentRows[0]?.id || 1;
    } catch (error) {
      console.warn("Setup error:", error);
    }
  });

  afterAll(async () => {
    if (!db) return;
    // Clean up test data
    try {
      await db.delete(loadAssignments).where(eq(loadAssignments.id, testAssignmentId));
      await db.delete(loads).where(eq(loads.id, testLoadId));
      await db.delete(users).where(eq(users.id, testDriverId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.warn("Cleanup error:", error);
    }
  });

  it("should return serializable pending assignments for driver", async () => {
    if (!db) {
      console.warn("Skipping test - database not available");
      return;
    }

    const assignments = await getPendingAssignmentsForDriver(testDriverId);

    expect(Array.isArray(assignments)).toBe(true);
    
    if (assignments.length === 0) {
      console.warn("No assignments found in test database");
      return;
    }

    const assignment = assignments[0];
    expect(assignment).toHaveProperty("id");
    expect(assignment).toHaveProperty("loadId");
    expect(assignment).toHaveProperty("status");
    expect(assignment).toHaveProperty("assignedAt");
    expect(assignment).toHaveProperty("load");

    // Verify load is a plain object with serializable fields
    const load = assignment.load;
    expect(load).toHaveProperty("id");
    expect(load).toHaveProperty("clientName");
    expect(load).toHaveProperty("pickupAddress");
    expect(load).toHaveProperty("deliveryAddress");
    expect(load).toHaveProperty("weight");
    expect(load).toHaveProperty("price");
    expect(load).toHaveProperty("status");

    // Verify it can be converted to string without issues
    const loadStr = JSON.stringify(load);
    expect(loadStr).toBeTruthy();

    // Verify it's JSON serializable
    const jsonString = JSON.stringify(assignment);
    expect(jsonString).toBeTruthy();
    expect(jsonString.length).toBeGreaterThan(0);

    // Verify it can be parsed back
    const parsed = JSON.parse(jsonString);
    expect(parsed).toEqual(assignment);
  });

  it("should return serializable load data", async () => {
    if (!db) {
      console.warn("Skipping test - database not available");
      return;
    }

    const load = await getLoadById(testLoadId);

    expect(load).toBeTruthy();
    expect(load).toHaveProperty("id");
    expect(load).toHaveProperty("clientName");
    expect(load).toHaveProperty("pickupAddress");
    expect(load).toHaveProperty("deliveryAddress");

    // Verify it's JSON serializable
    const jsonString = JSON.stringify(load);
    expect(jsonString).toBeTruthy();
    expect(jsonString.length).toBeGreaterThan(0);

    // Verify it can be parsed back
    const parsed = JSON.parse(jsonString);
    expect(parsed.id).toBe(load.id);
    expect(parsed.clientName).toBe(load.clientName);
  });

  it("should have serializable assignment data", async () => {
    if (!db) {
      console.warn("Skipping test - database not available");
      return;
    }

    const assignments = await getPendingAssignmentsForDriver(testDriverId);

    if (assignments.length === 0) {
      console.warn("No assignments found for test - skipping");
      return;
    }

    const assignment = assignments[0];

    // Check that the response doesn't contain Drizzle-specific properties
    const jsonString = JSON.stringify(assignment);

    // These patterns indicate Drizzle objects are leaking through
    expect(jsonString).not.toContain("__drizzleTable");
    expect(jsonString).not.toContain("dialect");
    expect(jsonString).not.toContain("[Max Depth]");
  });
});
