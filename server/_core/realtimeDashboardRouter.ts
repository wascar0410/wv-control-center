import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  driverLocations,
  loads,
  users as usersTable,
} from "../../drizzle/schema";

export const realtimeDashboardRouter = router({
  /**
   * Get all active driver locations with their current load info
   */
  getActiveDrivers: protectedProcedure
    .input(
      z.object({
        loadStatus: z.enum(["available", "in_transit", "delivered", "invoiced", "paid"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // Only admins can access this
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const drivers = await db
          .select({
            id: driverLocations.id,
            driverId: driverLocations.driverId,
            driverName: usersTable.name,
            driverPhone: usersTable.phone,
            driverEmail: usersTable.email,
            latitude: driverLocations.latitude,
            longitude: driverLocations.longitude,
            accuracy: driverLocations.accuracy,
            speed: driverLocations.speed,
            heading: driverLocations.heading,
            altitude: driverLocations.altitude,
            provider: driverLocations.provider,
            isActive: driverLocations.isActive,
            lastUpdate: driverLocations.lastUpdate,
            loadId: driverLocations.loadId,
            loadStatus: loads.status,
            clientName: loads.clientName,
            pickupAddress: loads.pickupAddress,
            deliveryAddress: loads.deliveryAddress,
            price: loads.price,
          })
          .from(driverLocations)
          .leftJoin(usersTable, eq(driverLocations.driverId, usersTable.id))
          .leftJoin(loads, eq(driverLocations.loadId, loads.id))
          .where(
            input?.loadStatus
              ? and(
                  eq(driverLocations.isActive, true),
                  eq(loads.status, input.loadStatus)
                )
              : eq(driverLocations.isActive, true)
          );

        return drivers.map((driver) => ({
          ...driver,
          latitude: parseFloat(driver.latitude?.toString() || "0"),
          longitude: parseFloat(driver.longitude?.toString() || "0"),
          accuracy: driver.accuracy ? parseInt(driver.accuracy?.toString() || "0") : null,
          speed: driver.speed ? parseFloat(driver.speed?.toString() || "0") : null,
          heading: driver.heading ? parseInt(driver.heading?.toString() || "0") : null,
          altitude: driver.altitude ? parseFloat(driver.altitude?.toString() || "0") : null,
        }));
      } catch (error) {
        console.error("Error fetching active drivers:", error);
        throw new Error("Failed to fetch active drivers");
      }
    }),

  /**
   * Get all active loads with their assigned driver info
   */
  getActiveLoads: protectedProcedure
    .input(
      z.object({
        status: z.enum(["available", "in_transit", "delivered", "invoiced", "paid"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // Only admins can access this
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const activeLoads = await db
          .select({
            id: loads.id,
            clientName: loads.clientName,
            pickupAddress: loads.pickupAddress,
            deliveryAddress: loads.deliveryAddress,
            pickupTime: loads.pickupTime,
            deliveryTime: loads.deliveryTime,
            status: loads.status,
            price: loads.price,
            weight: loads.weight,
            distance: loads.distance,
            assignedDriverId: loads.assignedDriverId,
            driverName: usersTable.name,
            driverPhone: usersTable.phone,
            driverLatitude: driverLocations.latitude,
            driverLongitude: driverLocations.longitude,
            driverLastUpdate: driverLocations.lastUpdate,
          })
          .from(loads)
          .leftJoin(usersTable, eq(loads.assignedDriverId, usersTable.id))
          .leftJoin(
            driverLocations,
            and(
              eq(driverLocations.driverId, loads.assignedDriverId || 0),
              eq(driverLocations.loadId, loads.id)
            )
          )
          .where(
            input?.status
              ? and(
                  isNotNull(loads.assignedDriverId),
                  eq(loads.status, input.status)
                )
              : isNotNull(loads.assignedDriverId)
          );

        return activeLoads.map((load) => ({
          ...load,
          driverLatitude: load.driverLatitude ? parseFloat(load.driverLatitude?.toString() || "0") : null,
          driverLongitude: load.driverLongitude ? parseFloat(load.driverLongitude?.toString() || "0") : null,
        }));
      } catch (error) {
        console.error("Error fetching active loads:", error);
        throw new Error("Failed to fetch active loads");
      }
    }),

  /**
   * Update driver location (called by driver app or WebSocket)
   */
  updateDriverLocation: protectedProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        speed: z.number().optional(),
        heading: z.number().optional(),
        altitude: z.number().optional(),
        provider: z.enum(["gps", "network", "fused"]).optional(),
        loadId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Check if location exists for this driver
        const existingLocation = await db
          .select()
          .from(driverLocations)
          .where(eq(driverLocations.driverId, ctx.user!.id))
          .limit(1)
          .then((rows) => rows[0]);

        if (existingLocation) {
          // Update existing location
          await db
            .update(driverLocations)
            .set({
              latitude: input.latitude,
              longitude: input.longitude,
              accuracy: input.accuracy,
              speed: input.speed,
              heading: input.heading,
              altitude: input.altitude,
              provider: input.provider,
              loadId: input.loadId,
              lastUpdate: new Date(),
            })
            .where(eq(driverLocations.driverId, ctx.user!.id));
        } else {
          // Create new location record
          await db.insert(driverLocations).values({
            driverId: ctx.user!.id,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
            speed: input.speed,
            heading: input.heading,
            altitude: input.altitude,
            provider: input.provider || "gps",
            loadId: input.loadId,
            isActive: true,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Error updating driver location:", error);
        throw new Error("Failed to update location");
      }
    }),

  /**
   * Get statistics for dashboard
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can access this
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    try {
      const activeDriversCount = await db
        .select()
        .from(driverLocations)
        .where(eq(driverLocations.isActive, true))
        .then((rows) => rows.length);

      const activeLoadsCount = await db
        .select()
        .from(loads)
        .where(
          and(
            isNotNull(loads.assignedDriverId),
            eq(loads.status, "in_transit" as any)
          )
        )
        .then((rows) => rows.length);

      const pendingLoadsCount = await db
        .select()
        .from(loads)
        .where(eq(loads.status, "pending"))
        .then((rows) => rows.length);

      return {
        activeDrivers: activeDriversCount,
        activeLoads: activeLoadsCount,
        pendingLoads: pendingLoadsCount,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw new Error("Failed to fetch dashboard statistics");
    }
  }),
});
