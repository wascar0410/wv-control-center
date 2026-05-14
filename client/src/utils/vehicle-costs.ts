/**
 * vehicle-costs.ts (Frontend)
 * 
 * FRONTEND MIRROR of canonical backend engine
 * 
 * These values MUST match server/core/financial/vehicle-cost-engine.ts exactly.
 * If you need to update costs, update the backend engine FIRST, then mirror here.
 * 
 * Do NOT make frontend-only changes to cost profiles.
 */

export type VehicleType = "cargo_van" | "sprinter" | "box_truck" | "semi_truck";

export interface VehicleProfile {
  id: VehicleType;
  label: string;
  mpg: number;
  fuelPerMile: number;
  maintenancePerMile: number;
  tirePerMile: number;
  depreciationPerMile: number;
  insuranceExposurePerMile: number;
  riskBufferPerMile: number;
  costPerMile: number; // Total operating cost per mile
  maxWeightLbs: number;
  capacityDescription: string;
}

export interface OperatingCosts {
  miles: number;
  vehicleType: VehicleType;
  vehicleLabel: string;
  fuel: number;
  maintenance: number;
  tires: number;
  depreciation: number;
  insurance: number;
  riskBuffer: number;
  total: number;
  costPerMile: number;
}

/**
 * Vehicle profiles - MUST MATCH backend canonical engine
 * 
 * Cargo Van Standard: ~$0.95/mile total
 * - Fuel: $0.28 (based on $3.60/gal, 12.9 mpg average)
 * - Maintenance: $0.12 (oil changes, filters, repairs)
 * - Tires: $0.05 (tire replacement reserve)
 * - Depreciation: $0.35 (vehicle value loss)
 * - Insurance: $0.10 (liability + physical damage)
 * - Risk Buffer: $0.05 (unexpected costs)
 */
export const VEHICLE_PROFILES: Record<VehicleType, VehicleProfile> = {
  cargo_van: {
    id: "cargo_van",
    label: "Cargo Van (Standard)",
    mpg: 12.9,
    fuelPerMile: 0.28,
    maintenancePerMile: 0.12,
    tirePerMile: 0.05,
    depreciationPerMile: 0.35,
    insuranceExposurePerMile: 0.10,
    riskBufferPerMile: 0.05,
    costPerMile: 0.95, // Total: 0.28 + 0.12 + 0.05 + 0.35 + 0.10 + 0.05
    maxWeightLbs: 3500,
    capacityDescription: "500-1500 lbs",
  },
  sprinter: {
    id: "sprinter",
    label: "Sprinter Van",
    mpg: 15.5,
    fuelPerMile: 0.23,
    maintenancePerMile: 0.14,
    tirePerMile: 0.06,
    depreciationPerMile: 0.42,
    insuranceExposurePerMile: 0.12,
    riskBufferPerMile: 0.06,
    costPerMile: 1.03, // Total: 0.23 + 0.14 + 0.06 + 0.42 + 0.12 + 0.06
    maxWeightLbs: 5000,
    capacityDescription: "1500-3000 lbs",
  },
  box_truck: {
    id: "box_truck",
    label: "Box Truck (14-16ft)",
    mpg: 10.5,
    fuelPerMile: 0.34,
    maintenancePerMile: 0.18,
    tirePerMile: 0.08,
    depreciationPerMile: 0.50,
    insuranceExposurePerMile: 0.15,
    riskBufferPerMile: 0.08,
    costPerMile: 1.33, // Total: 0.34 + 0.18 + 0.08 + 0.50 + 0.15 + 0.08
    maxWeightLbs: 10000,
    capacityDescription: "3000-8000 lbs",
  },
  semi_truck: {
    id: "semi_truck",
    label: "Semi Truck (53ft)",
    mpg: 7.0,
    fuelPerMile: 0.51,
    maintenancePerMile: 0.25,
    tirePerMile: 0.12,
    depreciationPerMile: 0.65,
    insuranceExposurePerMile: 0.20,
    riskBufferPerMile: 0.10,
    costPerMile: 1.83, // Total: 0.51 + 0.25 + 0.12 + 0.65 + 0.20 + 0.10
    maxWeightLbs: 80000,
    capacityDescription: "40000+ lbs",
  },
};

/**
 * Get vehicle profile by type
 */
export function getVehicleProfile(vehicleType?: VehicleType): VehicleProfile {
  if (!vehicleType || !VEHICLE_PROFILES[vehicleType]) {
    return VEHICLE_PROFILES.cargo_van;
  }
  return VEHICLE_PROFILES[vehicleType];
}

/**
 * Calculate cost per mile for vehicle type
 */
export function calculateCostPerMile(vehicleType?: VehicleType): number {
  const profile = getVehicleProfile(vehicleType);
  const total =
    profile.fuelPerMile +
    profile.maintenancePerMile +
    profile.tirePerMile +
    profile.depreciationPerMile +
    profile.insuranceExposurePerMile +
    profile.riskBufferPerMile;

  return Math.round(total * 100) / 100;
}

/**
 * Calculate operating costs for a given distance
 * @param miles Distance in miles
 * @param vehicleType Type of vehicle (default: cargo_van)
 * @returns Operating costs breakdown
 */
export function calculateOperatingCosts(
  miles: number,
  vehicleType: VehicleType = "cargo_van"
): OperatingCosts {
  const profile = getVehicleProfile(vehicleType);
  const safeMiles = Math.max(0, Number(miles) || 0);

  const fuel = Math.round(safeMiles * profile.fuelPerMile * 100) / 100;
  const maintenance = Math.round(safeMiles * profile.maintenancePerMile * 100) / 100;
  const tires = Math.round(safeMiles * profile.tirePerMile * 100) / 100;
  const depreciation = Math.round(safeMiles * profile.depreciationPerMile * 100) / 100;
  const insurance = Math.round(safeMiles * profile.insuranceExposurePerMile * 100) / 100;
  const riskBuffer = Math.round(safeMiles * profile.riskBufferPerMile * 100) / 100;

  const costPerMile = calculateCostPerMile(vehicleType);
  const total = Math.round(safeMiles * costPerMile * 100) / 100;

  return {
    miles: safeMiles,
    vehicleType,
    vehicleLabel: profile.label,
    fuel,
    maintenance,
    tires,
    depreciation,
    insurance,
    riskBuffer,
    total,
    costPerMile,
  };
}

/**
 * Get cost summary for display
 */
export function getCostSummary(
  miles: number,
  vehicleType: VehicleType = "cargo_van"
): string {
  const costs = calculateOperatingCosts(miles, vehicleType);
  return `$${costs.costPerMile.toFixed(2)}/mi (${costs.total.toFixed(0)} total)`;
}
