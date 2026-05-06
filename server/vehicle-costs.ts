/**
 * vehicle-costs.ts
 * Unified vehicle cost engine - Single source of truth for all cost calculations
 * Used by both backend (quotation calculator) and frontend
 */

export type VehicleType = "cargo_van" | "sprinter" | "box_truck" | "semi_truck";

export interface VehicleProfile {
  name: string;
  costPerMile: number;
  fuel: number;
  maintenance: number;
  tires: number;
  depreciation: number;
  risk: number;
  maxWeight: number;
  capacity: string;
}

export const VEHICLE_PROFILES: Record<VehicleType, VehicleProfile> = {
  cargo_van: {
    name: "Cargo Van",
    costPerMile: 0.56,
    fuel: 0.28,
    maintenance: 0.08,
    tires: 0.03,
    depreciation: 0.12,
    risk: 0.05,
    maxWeight: 3500,
    capacity: "500-1500 lbs",
  },
  sprinter: {
    name: "Sprinter Van",
    costPerMile: 0.68,
    fuel: 0.35,
    maintenance: 0.10,
    tires: 0.04,
    depreciation: 0.14,
    risk: 0.05,
    maxWeight: 5000,
    capacity: "1500-3000 lbs",
  },
  box_truck: {
    name: "Box Truck",
    costPerMile: 0.85,
    fuel: 0.42,
    maintenance: 0.12,
    tires: 0.05,
    depreciation: 0.18,
    risk: 0.08,
    maxWeight: 10000,
    capacity: "3000-8000 lbs",
  },
  semi_truck: {
    name: "Semi Truck",
    costPerMile: 1.15,
    fuel: 0.58,
    maintenance: 0.18,
    tires: 0.08,
    depreciation: 0.22,
    risk: 0.09,
    maxWeight: 40000,
    capacity: "20000+ lbs",
  },
};

/**
 * Calculate operating cost for a load based on vehicle type and miles
 * SINGLE SOURCE OF TRUTH for all cost calculations
 */
export function calculateVehicleOperatingCost(
  vehicleType: VehicleType,
  miles: number
): number {
  const profile = VEHICLE_PROFILES[vehicleType] || VEHICLE_PROFILES.cargo_van;
  return miles * profile.costPerMile;
}

/**
 * Get vehicle profile by type
 */
export function getVehicleProfile(vehicleType: VehicleType): VehicleProfile {
  return VEHICLE_PROFILES[vehicleType] || VEHICLE_PROFILES.cargo_van;
}

/**
 * Calculate detailed cost breakdown
 */
export function calculateDetailedCosts(
  vehicleType: VehicleType,
  miles: number
): {
  fuel: number;
  maintenance: number;
  tires: number;
  depreciation: number;
  risk: number;
  total: number;
} {
  const profile = getVehicleProfile(vehicleType);
  return {
    fuel: miles * profile.fuel,
    maintenance: miles * profile.maintenance,
    tires: miles * profile.tires,
    depreciation: miles * profile.depreciation,
    risk: miles * profile.risk,
    total: miles * profile.costPerMile,
  };
}
