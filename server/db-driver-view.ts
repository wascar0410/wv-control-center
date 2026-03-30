import { and, eq, inArray, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  loads,
  podDocuments,
  fuelLogs as fuelLogsTable,
  users,
  loadAssignments,
} from "../drizzle/schema";

/**
 * Get all loads for a driver with filtering by status
 */
export async function getDriverLoads(
  driverId: number,
  status?: "available" | "in_transit" | "delivered"
) {
  const db = await getDb();
  if (!db) return [];

  try {
    let whereCondition: any = eq(loads.assignedDriverId, driverId);
    
    if (status) {
      whereCondition = and(whereCondition, eq(loads.status, status));
    }

    const results = await db
      .select()
      .from(loads)
      .where(whereCondition)
      .orderBy(desc(loads.createdAt));

    // Convert decimal fields to numbers
    return results.map(load => ({
      ...load,
      weight: Number(load.weight),
      price: Number(load.price),
      estimatedFuel: Number(load.estimatedFuel || 0),
      estimatedTolls: Number(load.estimatedTolls || 0),
      pickupLat: load.pickupLat ? Number(load.pickupLat) : undefined,
      pickupLng: load.pickupLng ? Number(load.pickupLng) : undefined,
      deliveryLat: load.deliveryLat ? Number(load.deliveryLat) : undefined,
      deliveryLng: load.deliveryLng ? Number(load.deliveryLng) : undefined,
    }));
  } catch (error) {
    console.error("[Database] Error getting driver loads:", error);
    return [];
  }
}

/**
 * Get detailed information about a specific load
 */
export async function getLoadDetailsForDriver(loadId: number, driverId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const results = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.id, loadId),
          eq(loads.assignedDriverId, driverId)
        )
      )
      .limit(1);

    const load = results[0] || null;

    if (!load) return null;

    // Get POD documents for this load
    const pods = await db
      .select()
      .from(podDocuments)
      .where(eq(podDocuments.loadId, loadId))
      .orderBy(desc(podDocuments.uploadedAt));

    return {
      ...load,
      weight: Number(load.weight),
      price: Number(load.price),
      estimatedFuel: Number(load.estimatedFuel || 0),
      estimatedTolls: Number(load.estimatedTolls || 0),
      pickupLat: load.pickupLat ? Number(load.pickupLat) : undefined,
      pickupLng: load.pickupLng ? Number(load.pickupLng) : undefined,
      deliveryLat: load.deliveryLat ? Number(load.deliveryLat) : undefined,
      deliveryLng: load.deliveryLng ? Number(load.deliveryLng) : undefined,
      proofOfDelivery: pods,
    };
  } catch (error) {
    console.error("[Database] Error getting load details:", error);
    return null;
  }
}

/**
 * Get next available or priority load for driver
 */
export async function getNextPriorityLoad(driverId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // First try to find available loads
    const availableResults = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          eq(loads.status, "available")
        )
      )
      .orderBy(loads.createdAt)
      .limit(1);

    let load = availableResults[0] || null;

    // If no available, get in_transit
    if (!load) {
      const inTransitResults = await db
        .select()
        .from(loads)
        .where(
          and(
            eq(loads.assignedDriverId, driverId),
            eq(loads.status, "in_transit")
          )
        )
        .orderBy(loads.createdAt)
        .limit(1);
      
      load = inTransitResults[0] || null;
    }

    if (!load) return null;

    return {
      ...load,
      weight: Number(load.weight),
      price: Number(load.price),
      estimatedFuel: Number(load.estimatedFuel || 0),
      estimatedTolls: Number(load.estimatedTolls || 0),
      pickupLat: load.pickupLat ? Number(load.pickupLat) : undefined,
      pickupLng: load.pickupLng ? Number(load.pickupLng) : undefined,
      deliveryLat: load.deliveryLat ? Number(load.deliveryLat) : undefined,
      deliveryLng: load.deliveryLng ? Number(load.deliveryLng) : undefined,
    };
  } catch (error) {
    console.error("[Database] Error getting next priority load:", error);
    return null;
  }
}

/**
 * Get driver stats including earnings, deliveries, rating
 */
export async function getDriverStatsForView(driverId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get delivered loads
    const deliveredLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          inArray(loads.status, ["delivered", "invoiced", "paid"])
        )
      );

    // Get paid loads for earnings
    const paidLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          eq(loads.status, "paid")
        )
      );

    // Get active loads
    const activeLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          inArray(loads.status, ["available", "in_transit"])
        )
      );

    // Calculate totals
    const totalEarnings = paidLoads.reduce((sum, load) => sum + Number(load.price || 0), 0);
    const totalDeliveries = deliveredLoads.length;
    const activeCount = activeLoads.length;

    // Get fuel expenses
    const fuelLogsData = await db
      .select()
      .from(fuelLogsTable)
      .where(eq(fuelLogsTable.driverId, driverId));

    const totalFuelExpense = fuelLogsData.reduce((sum: number, log: any) => sum + Number(log.amount || 0), 0);

    // Calculate efficiency (net margin / total income)
    const totalNetMargin = paidLoads.reduce((sum, load) => {
      const fuel = Number(load.estimatedFuel || 0);
      const tolls = Number(load.estimatedTolls || 0);
      return sum + (Number(load.price || 0) - fuel - tolls);
    }, 0);

    const efficiency = totalEarnings > 0 
      ? Math.round((totalNetMargin / totalEarnings) * 100) 
      : 0;

    // Get driver info for rating (if available in user profile)
    const driver = await db
      .select()
      .from(users)
      .where(eq(users.id, driverId))
      .limit(1)
      .then(rows => rows[0]);

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalDeliveries,
      activeLoads: activeCount,
      totalFuelExpense: Math.round(totalFuelExpense * 100) / 100,
      netMargin: Math.round(totalNetMargin * 100) / 100,
      efficiency,
      rating: 4.8, // TODO: Calculate from actual ratings if available
      driverName: driver?.name || "Driver",
    };
  } catch (error) {
    console.error("[Database] Error getting driver stats:", error);
    return null;
  }
}

/**
 * Save delivery confirmation with notes and timestamp
 */
export async function confirmDelivery(
  loadId: number,
  driverId: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Verify the load belongs to this driver
    const load = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.id, loadId),
          eq(loads.assignedDriverId, driverId)
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    if (!load) {
      throw new Error("Load not found or does not belong to this driver");
    }

    // Check if already delivered (prevent duplicates)
    if (load.status === "delivered") {
      throw new Error("This load has already been marked as delivered");
    }

    // Update load status and add notes
    await db
      .update(loads)
      .set({
        status: "delivered",
        deliveryDate: new Date(),
        notes: notes ? `${load.notes || ""}\n[Delivery Confirmed] ${notes}` : load.notes,
        updatedAt: new Date(),
      })
      .where(eq(loads.id, loadId));

    return { success: true, loadId };
  } catch (error) {
    console.error("[Database] Error confirming delivery:", error);
    throw error;
  }
}

/**
 * Get proof of delivery documents for a load
 */
export async function getProofOfDeliveryForLoad(loadId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(podDocuments)
      .where(eq(podDocuments.loadId, loadId))
      .orderBy(desc(podDocuments.uploadedAt));
  } catch (error) {
    console.error("[Database] Error getting POD:", error);
    return [];
  }
}

/**
 * Save proof of delivery document with optional notes
 */
export async function saveProofOfDelivery(
  loadId: number,
  driverId: number,
  documentUrl: string,
  documentKey: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  deliveryNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(podDocuments).values({
      loadId,
      driverId,
      documentUrl,
      documentKey,
      fileName,
      fileSize,
      mimeType,
      notes: deliveryNotes || null,
      uploadedAt: new Date(),
      createdAt: new Date(),
    });

    return result;
  } catch (error) {
    console.error("[Database] Error saving POD:", error);
    throw error;
  }
}

/**
 * Get driver earnings summary for a period
 */
export async function getDriverEarnings(
  driverId: number,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return null;

  try {
    let whereConditions = and(
      eq(loads.assignedDriverId, driverId),
      eq(loads.status, "paid")
    );

    if (startDate && endDate) {
      whereConditions = and(
        whereConditions,
        sql`${loads.deliveryDate} >= ${startDate}`,
        sql`${loads.deliveryDate} <= ${endDate}`
      );
    }

    const paidLoads = await db
      .select()
      .from(loads)
      .where(whereConditions);

    const totalIncome = paidLoads.reduce((sum, load) => sum + Number(load.price || 0), 0);
    const totalExpenses = paidLoads.reduce(
      (sum, load) => sum + (Number(load.estimatedFuel || 0) + Number(load.estimatedTolls || 0)),
      0
    );

    // Add fuel expenses
    let fuelWhereConditions: any = eq(fuelLogsTable.driverId, driverId);

    if (startDate && endDate) {
      fuelWhereConditions = and(
        fuelWhereConditions,
        sql`${fuelLogsTable.logDate} >= ${startDate}`,
        sql`${fuelLogsTable.logDate} <= ${endDate}`
      );
    }

    const fuelLogsDataResult = await db
      .select()
      .from(fuelLogsTable)
      .where(fuelWhereConditions);
    const totalFuelExpense = fuelLogsDataResult.reduce((sum: number, log: any) => sum + Number(log.amount || 0), 0);

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round((totalExpenses + totalFuelExpense) * 100) / 100,
      netEarnings: Math.round((totalIncome - totalExpenses - totalFuelExpense) * 100) / 100,
      deliveryCount: paidLoads.length,
      averagePerDelivery: paidLoads.length > 0 
        ? Math.round((totalIncome / paidLoads.length) * 100) / 100 
        : 0,
    };
  } catch (error) {
    console.error("[Database] Error getting driver earnings:", error);
    return null;
  }
}

/**
 * Check if driver has already submitted proof for a load (prevent duplicates)
 */
export async function hasProofOfDelivery(loadId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db
      .select()
      .from(podDocuments)
      .where(eq(podDocuments.loadId, loadId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("[Database] Error checking POD:", error);
    return false;
  }
}
