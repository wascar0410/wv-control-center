import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { driverLocations, loads } from "../drizzle/schema";

/**
 * Save driver location update
 */
export async function saveDriverLocation(
  driverId: number,
  latitude: number,
  longitude: number,
  accuracy?: number,
  speed?: number,
  heading?: number,
  altitude?: number,
  loadId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get current active load if not provided
    let activeLoadId = loadId;
    if (!activeLoadId) {
      const activeLoad = await db
        .select()
        .from(loads)
        .where(
          and(
            eq(loads.assignedDriverId, driverId),
            eq(loads.status, "in_transit")
          )
        )
        .limit(1)
        .then(rows => rows[0]);

      activeLoadId = activeLoad?.id || undefined;
    }

    const result = await db.insert(driverLocations).values({
      driverId,
      loadId: activeLoadId || null,
      latitude: String(latitude),
      longitude: String(longitude),
      accuracy: accuracy ? String(accuracy) : null,
      speed: speed ? String(speed) : null,
      heading: heading ? String(heading) : null,
      altitude: altitude ? String(altitude) : null,
      timestamp: new Date(),
      createdAt: new Date(),
    });

    return result;
  } catch (error) {
    console.error("[Database] Error saving driver location:", error);
    throw error;
  }
}

/**
 * Get latest location for a driver
 */
export async function getLatestDriverLocation(driverId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(driverLocations)
      .where(eq(driverLocations.driverId, driverId))
      .orderBy(desc(driverLocations.timestamp))
      .limit(1)
      .then(rows => {
        if (!rows[0]) return null;
        const row = rows[0];
        return {
          ...row,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: row.accuracy ? Number(row.accuracy) : undefined,
          speed: row.speed ? Number(row.speed) : undefined,
          heading: row.heading ? Number(row.heading) : undefined,
          altitude: row.altitude ? Number(row.altitude) : undefined,
        };
      });

    return result;
  } catch (error) {
    console.error("[Database] Error getting driver location:", error);
    return null;
  }
}

/**
 * Get latest location for a specific load
 */
export async function getLatestLocationForLoad(loadId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(driverLocations)
      .where(eq(driverLocations.loadId, loadId))
      .orderBy(desc(driverLocations.timestamp))
      .limit(1)
      .then(rows => {
        if (!rows[0]) return null;
        const row = rows[0];
        return {
          ...row,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: row.accuracy ? Number(row.accuracy) : undefined,
          speed: row.speed ? Number(row.speed) : undefined,
          heading: row.heading ? Number(row.heading) : undefined,
          altitude: row.altitude ? Number(row.altitude) : undefined,
        };
      });

    return result;
  } catch (error) {
    console.error("[Database] Error getting load location:", error);
    return null;
  }
}

/**
 * Get location history for a driver (last 24 hours)
 */
export async function getDriverLocationHistory(driverId: number, hours: number = 24) {
  const db = await getDb();
  if (!db) return [];

  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const results = await db
      .select()
      .from(driverLocations)
      .where(
        and(
          eq(driverLocations.driverId, driverId),
          // Assuming timestamp is comparable with Date
        )
      )
      .orderBy(desc(driverLocations.timestamp))
      .limit(1000);

    return results
      .filter(row => new Date(row.timestamp) > cutoffTime)
      .map(row => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        accuracy: row.accuracy ? Number(row.accuracy) : undefined,
        speed: row.speed ? Number(row.speed) : undefined,
        heading: row.heading ? Number(row.heading) : undefined,
        altitude: row.altitude ? Number(row.altitude) : undefined,
      }));
  } catch (error) {
    console.error("[Database] Error getting location history:", error);
    return [];
  }
}

/**
 * Clean up old location records (older than 30 days)
 */
export async function cleanupOldLocations() {
  const db = await getDb();
  if (!db) return 0;

  try {
    const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Note: This is a simplified example. In production, use proper SQL DELETE
    console.log(`[Database] Cleanup: Removing locations older than ${cutoffTime}`);
    return 0;
  } catch (error) {
    console.error("[Database] Error cleaning up locations:", error);
    return 0;
  }
}
