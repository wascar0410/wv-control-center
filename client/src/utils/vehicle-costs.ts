/**
 * vehicle-costs.ts
 * Professional vehicle operating cost calculations
 * Based on industry standards for cargo van operations
 */

export type VehicleType = "cargo_van" | "sprinter" | "box_truck" | "semi_truck";

export interface VehicleProfile {
  type: VehicleType;
  name: string;
  fuelPerMile: number;
  maintenancePerMile: number;
  tiresPerMile: number;
  depreciationPerMile: number;
  riskBufferPerMile: number;
}

export interface OperatingCosts {
  fuel: number;
  maintenance: number;
  tires: number;
  depreciation: number;
  riskBuffer: number;
  totalPerMile: number;
  totalForDistance: number;
}

/**
 * Vehicle profiles with realistic operating costs per mile
 * Based on industry standards and DOT regulations
 */
export const VEHICLE_PROFILES: Record<VehicleType, VehicleProfile> = {
  cargo_van: {
    type: "cargo_van",
    name: "Cargo Van",
    fuelPerMile: 0.28, // ~3.5 MPG at $3.50/gal
    maintenancePerMile: 0.08, // Oil changes, filters, repairs
    tiresPerMile: 0.03, // Tire replacement cycles
    depreciationPerMile: 0.12, // Vehicle value depreciation
    riskBufferPerMile: 0.05, // Insurance, contingency
  },
  sprinter: {
    type: "sprinter",
    name: "Sprinter Van",
    fuelPerMile: 0.22, // ~4.5 MPG at $3.50/gal
    maintenancePerMile: 0.07,
    tiresPerMile: 0.03,
    depreciationPerMile: 0.14,
    riskBufferPerMile: 0.06,
  },
  box_truck: {
    type: "box_truck",
    name: "Box Truck",
    fuelPerMile: 0.32, // ~3.1 MPG at $3.50/gal
    maintenancePerMile: 0.10,
    tiresPerMile: 0.04,
    depreciationPerMile: 0.15,
    riskBufferPerMile: 0.07,
  },
  semi_truck: {
    type: "semi_truck",
    name: "Semi Truck",
    fuelPerMile: 0.38, // ~2.6 MPG at $3.50/gal
    maintenancePerMile: 0.12,
    tiresPerMile: 0.05,
    depreciationPerMile: 0.18,
    riskBufferPerMile: 0.08,
  },
};

/**
 * Get vehicle profile by type
 */
export function getVehicleProfile(vehicleType: VehicleType = "cargo_van"): VehicleProfile {
  return VEHICLE_PROFILES[vehicleType] || VEHICLE_PROFILES.cargo_van;
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
  const distance = Math.max(0, Number(miles) || 0);

  const fuel = distance * profile.fuelPerMile;
  const maintenance = distance * profile.maintenancePerMile;
  const tires = distance * profile.tiresPerMile;
  const depreciation = distance * profile.depreciationPerMile;
  const riskBuffer = distance * profile.riskBufferPerMile;

  const totalPerMile =
    profile.fuelPerMile +
    profile.maintenancePerMile +
    profile.tiresPerMile +
    profile.depreciationPerMile +
    profile.riskBufferPerMile;

  const totalForDistance = distance * totalPerMile;

  return {
    fuel,
    maintenance,
    tires,
    depreciation,
    riskBuffer,
    totalPerMile,
    totalForDistance,
  };
}

/**
 * Calculate real profit after operating costs
 * @param revenue Load price
 * @param miles Distance
 * @param tolls Toll costs
 * @param vehicleType Vehicle type
 * @returns Real profit after all costs
 */
export function calculateRealProfit(
  revenue: number,
  miles: number,
  tolls: number = 0,
  vehicleType: VehicleType = "cargo_van"
): number {
  const costs = calculateOperatingCosts(miles, vehicleType);
  return revenue - costs.totalForDistance - tolls;
}

/**
 * Get cost breakdown summary
 */
export function getCostSummary(
  miles: number,
  vehicleType: VehicleType = "cargo_van"
): {
  label: string;
  value: number;
}[] {
  const costs = calculateOperatingCosts(miles, vehicleType);
  return [
    { label: "Fuel", value: costs.fuel },
    { label: "Maintenance", value: costs.maintenance },
    { label: "Tires", value: costs.tires },
    { label: "Depreciation", value: costs.depreciation },
    { label: "Risk Buffer", value: costs.riskBuffer },
  ];
}
