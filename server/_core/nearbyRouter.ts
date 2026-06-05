/**
 * nearbyRouter.ts — Nearby Drivers Assignment
 * Procedures for finding nearby drivers for load assignment
 */
import { z } from "zod";
import { eq, and, not, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./trpc";
import { getDb } from "../db";
import { users as usersTable, loads as loadsTable } from "../../drizzle/schema";

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const nearbyRouter = router({
  /**
   * Get nearby drivers for a load based on pickup location
   * Returns drivers sorted by distance, with GPS and availability status
   */
  getDrivers: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
        pickupLat: z.number(),
        pickupLng: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Only owner/admin can view nearby drivers
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new Error("No autorizado");
      }

      // Get all drivers (role = 'driver', not archived)
      const drivers = await db
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.role, "driver"),
            not(sql`${usersTable.email} LIKE 'archived+%'`)
          )
        );

      // Calculate distance for each driver
      const driversWithDistance = drivers
        .map((driver) => {
          const driverLat = driver.currentLat || 0;
          const driverLng = driver.currentLng || 0;
          const distance = calculateDistance(
            input.pickupLat,
            input.pickupLng,
            driverLat,
            driverLng
          );

          // Parse vehicleInfo
          let vehicleInfo: any = {};
          try {
            if (driver.vehicleInfo && typeof driver.vehicleInfo === "string") {
              vehicleInfo = JSON.parse(driver.vehicleInfo);
            } else if (driver.vehicleInfo && typeof driver.vehicleInfo === "object") {
              vehicleInfo = driver.vehicleInfo;
            }
          } catch (e) {
            vehicleInfo = {};
          }

          return {
            id: driver.id,
            name: driver.name || "Unknown",
            email: driver.email || "",
            distance,
            currentLat: driver.currentLat,
            currentLng: driver.currentLng,
            lastLocationUpdate: driver.lastLocationUpdate,
            availableForLoads: vehicleInfo.availableForLoads !== false, // Default true
            vehicleType: vehicleInfo.vehicleType || "Unknown",
            vehicleName: vehicleInfo.vehicleName || "",
            vehiclePlate: vehicleInfo.vehiclePlate || "",
            // Compliance fields
            dotCertification: driver.dotCertification || false,
            licenseExpiry: driver.licenseExpiry,
            insuranceExpiry: driver.insuranceExpiry,
            leaseContractExpiry: driver.leaseContractExpiry,
          };
        })
        // Sort by: GPS status (active first), then availability, then distance
        .sort((a, b) => {
          // GPS active (recent update) comes first
          const aGpsActive = a.lastLocationUpdate && new Date(a.lastLocationUpdate).getTime() > Date.now() - 5 * 60 * 1000; // 5 min
          const bGpsActive = b.lastLocationUpdate && new Date(b.lastLocationUpdate).getTime() > Date.now() - 5 * 60 * 1000;
          if (aGpsActive !== bGpsActive) return aGpsActive ? -1 : 1;

          // Available comes first
          if (a.availableForLoads !== b.availableForLoads) {
            return a.availableForLoads ? -1 : 1;
          }

          // Then by distance
          return a.distance - b.distance;
        });

      return driversWithDistance;
    }),
});
