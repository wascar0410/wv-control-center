import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import {
  recordDriverLocation,
  getLatestDriverLocation,
  getDriverLocationHistory,
  getAllActiveDriverLocations,
  getDriverLocationsByLoadId,
} from "../db";

export const locationRouter = router({
  /**
   * Record driver's current GPS location
   * Called from driver's mobile app/browser
   */
  recordLocation: protectedProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        speed: z.number().optional(),
        heading: z.number().optional(),
        altitude: z.number().optional(),
        loadId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "driver") {
        throw new Error("Only drivers can record their location");
      }

      const locationId = await recordDriverLocation({
        driverId: ctx.user.id,
        latitude: input.latitude as any,
        longitude: input.longitude as any,
        accuracy: input.accuracy as any,
        speed: input.speed as any,
        heading: input.heading as any,
        altitude: input.altitude as any,
        loadId: input.loadId,
      });

      return { success: true, locationId };
    }),

  /**
   * Get current location of a specific driver
   * Only accessible by admin or the driver themselves
   */
  getDriverLocation: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Only admin or the driver themselves can view
      if (ctx.user.role !== "admin" && ctx.user.id !== input.driverId) {
        throw new Error("Unauthorized");
      }

      const location = await getLatestDriverLocation(input.driverId);
      return location || null;
    }),

  /**
   * Get location history for a driver
   * Admin only
   */
  getDriverLocationHistory: protectedProcedure
    .input(
      z.object({
        driverId: z.number(),
        minutesBack: z.number().min(1).max(1440).default(60), // Max 24 hours
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view location history");
      }

      return await getDriverLocationHistory(input.driverId, input.minutesBack);
    }),

  /**
   * Get all active drivers' locations (last 5 minutes)
   * Admin only - for dashboard
   */
  getAllActiveDrivers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Only admins can view all driver locations");
    }

    const locations = await getAllActiveDriverLocations();
    
    // Enrich with driver info
    return locations.map((loc) => ({
      ...loc,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      accuracy: loc.accuracy ? Number(loc.accuracy) : undefined,
      speed: loc.speed ? Number(loc.speed) : undefined,
      heading: loc.heading ? Number(loc.heading) : undefined,
      altitude: loc.altitude ? Number(loc.altitude) : undefined,
    }));
  }),

  /**
   * Get location history for a specific load
   * Admin or assigned driver
   */
  getLoadLocationTrail: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ ctx, input }) => {
      // TODO: Verify user has access to this load
      const locations = await getDriverLocationsByLoadId(input.loadId);
      
      return locations.map((loc) => ({
        ...loc,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        accuracy: loc.accuracy ? Number(loc.accuracy) : undefined,
        speed: loc.speed ? Number(loc.speed) : undefined,
        heading: loc.heading ? Number(loc.heading) : undefined,
        altitude: loc.altitude ? Number(loc.altitude) : undefined,
      }));
    }),
});
