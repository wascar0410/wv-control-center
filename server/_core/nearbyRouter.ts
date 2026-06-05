/**
 * nearbyRouter.ts — Nearby Drivers Assignment + Deadhead Economics
 * Procedures for finding nearby drivers with deadhead distance and adjusted economics
 */
import { z } from "zod";
import { eq, and, not, sql, desc } from "drizzle-orm";
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

// Calculate ETA in minutes based on distance and speed
function calculateETA(distanceMiles: number, speedMph: number = 40): number {
  return (distanceMiles / speedMph) * 60;
}

// Get vehicle costs from vehicleInfo or use defaults
function getVehicleCosts(vehicleInfo: any): { fuelCostPerMile: number; maintenanceCostPerMile: number } {
  const defaults = { fuelCostPerMile: 0.22, maintenanceCostPerMile: 0.12 };
  
  if (!vehicleInfo) return defaults;
  
  return {
    fuelCostPerMile: vehicleInfo.fuelCostPerMile ?? defaults.fuelCostPerMile,
    maintenanceCostPerMile: vehicleInfo.maintenanceCostPerMile ?? defaults.maintenanceCostPerMile,
  };
}

export const nearbyRouter = router({
  /**
   * Get nearby drivers for a load based on pickup location
   * Returns drivers with deadhead distance, ETA, and adjusted economics
   */
  getDrivers: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
        pickupLat: z.number(),
        pickupLng: z.number(),
        deliveryLat: z.number().optional(),
        deliveryLng: z.number().optional(),
        loadPrice: z.number().optional(),
        estimatedTolls: z.number().optional(),
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

      // Get driver locations from raw SQL (since we don't have Drizzle schema for driver_locations)
      let driverLocations: any[] = [];
      if (drivers.length > 0) {
        const driverIds = drivers.map(d => d.id);
        const result: any = await db.execute(sql`
          SELECT driverId, latitude, longitude, accuracy, speed, heading, timestamp
          FROM driver_locations
          WHERE driverId IN (${driverIds})
          ORDER BY driverId, timestamp DESC
        `);
        driverLocations = Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) ? result[0] : result;
      }

      // Group locations by driverId, keeping only the most recent
      const latestLocationsByDriver = new Map();
      driverLocations.forEach((loc: any) => {
        if (!latestLocationsByDriver.has(loc.driverId)) {
          latestLocationsByDriver.set(loc.driverId, loc);
        }
      });

      // Calculate distance for each driver
      const driversWithDistance = drivers
        .map((driver) => {
          // Get latest location from driver_locations
          const latestLocation = latestLocationsByDriver.get(driver.id);
          const driverLat = latestLocation ? Number(latestLocation.latitude) : null;
          const driverLng = latestLocation ? Number(latestLocation.longitude) : null;
          const lastLocationUpdate = latestLocation ? latestLocation.timestamp : null;
          const gpsInactive = !latestLocation || (lastLocationUpdate && new Date(lastLocationUpdate).getTime() < Date.now() - 5 * 60 * 1000);

          // Calculate deadhead distance (driver current location -> pickup)
          let distanceToPickupMiles: number | null = null;
          let etaToPickupMinutes: number | null = null;
          if (driverLat !== null && driverLng !== null) {
            distanceToPickupMiles = calculateDistance(
              driverLat,
              driverLng,
              input.pickupLat,
              input.pickupLng
            );
            etaToPickupMinutes = calculateETA(distanceToPickupMiles);
          }

          // Calculate loaded miles (pickup -> delivery)
          let loadedMiles: number | null = null;
          if (input.deliveryLat !== undefined && input.deliveryLng !== undefined) {
            loadedMiles = calculateDistance(
              input.pickupLat,
              input.pickupLng,
              input.deliveryLat,
              input.deliveryLng
            );
          }

          // Calculate total operational miles
          let totalOperationalMiles: number | null = null;
          if (distanceToPickupMiles !== null && loadedMiles !== null) {
            totalOperationalMiles = distanceToPickupMiles + loadedMiles;
          }

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

          // Get vehicle costs
          const { fuelCostPerMile, maintenanceCostPerMile } = getVehicleCosts(vehicleInfo);
          const totalCostPerMile = fuelCostPerMile + maintenanceCostPerMile;

          // Calculate adjusted economics
          let estimatedOperationalCost: number | null = null;
          let adjustedEstimatedNet: number | null = null;
          let payPerOperationalMile: number | null = null;

          if (totalOperationalMiles !== null && input.loadPrice !== undefined) {
            estimatedOperationalCost = totalOperationalMiles * totalCostPerMile;
            const tolls = input.estimatedTolls || 0;
            adjustedEstimatedNet = input.loadPrice - estimatedOperationalCost - tolls;
            payPerOperationalMile = input.loadPrice / totalOperationalMiles;
          }

          return {
            id: driver.id,
            name: driver.name || "Unknown",
            email: driver.email || "",
            // Driver location
            driverLatitude: driverLat,
            driverLongitude: driverLng,
            lastLocationUpdate,
            accuracy: latestLocation ? Number(latestLocation.accuracy) : null,
            speed: latestLocation ? Number(latestLocation.speed) : null,
            heading: latestLocation ? Number(latestLocation.heading) : null,
            gpsInactive,
            // Deadhead and ETA
            distanceToPickupMiles,
            etaToPickupMinutes,
            // Loaded miles
            loadedMiles,
            totalOperationalMiles,
            // Economics
            fuelCostPerMile,
            maintenanceCostPerMile,
            totalCostPerMile,
            estimatedOperationalCost,
            adjustedEstimatedNet,
            payPerOperationalMile,
            // Availability
            availableForLoads: vehicleInfo.availableForLoads !== false,
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
        // Sort by: GPS status (active first), then availability, then distance to pickup
        .sort((a, b) => {
          // GPS active comes first
          if (a.gpsInactive !== b.gpsInactive) return a.gpsInactive ? 1 : -1;

          // Available comes first
          if (a.availableForLoads !== b.availableForLoads) {
            return a.availableForLoads ? -1 : 1;
          }

          // Then by distance to pickup (closest first)
          if (a.distanceToPickupMiles !== null && b.distanceToPickupMiles !== null) {
            return a.distanceToPickupMiles - b.distanceToPickupMiles;
          }

          // No GPS data goes to end
          if (a.distanceToPickupMiles === null && b.distanceToPickupMiles !== null) return 1;
          if (a.distanceToPickupMiles !== null && b.distanceToPickupMiles === null) return -1;

          return 0;
        });

      return driversWithDistance;
    }),
});
