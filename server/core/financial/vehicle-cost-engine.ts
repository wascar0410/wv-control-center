/**
 * vehicle-cost-engine.ts
 * 
 * SINGLE SOURCE OF TRUTH for all vehicle cost calculations in WV Control Center.
 * 
 * This module centralizes all financial logic related to vehicle operating costs,
 * fuel calculations, maintenance reserves, and profitability assessments.
 * 
 * All consumers (backend routers, frontend components, advisors, snapshots) must
 * use functions from this module. No duplicate formulas allowed.
 * 
 * Design principles:
 * - Pure functions where possible
 * - Explicit inputs and typed outputs
 * - Safe number guards (no NaN leaks)
 * - No silent fallbacks pretending to be high-confidence
 * - Structured blocked/unknown results for invalid data
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
  maxWeightLbs: number;
  capacityDescription: string;
  assumptions: string[];
}

/**
 * Vehicle profiles with realistic cargo van operating costs
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
    maxWeightLbs: 3500,
    capacityDescription: "500-1500 lbs",
    assumptions: [
      "Fuel price: $3.60/gallon",
      "Average MPG: 12.9 (mixed city/highway)",
      "Maintenance: routine + unexpected repairs",
      "Depreciation: 5-year useful life",
      "Insurance: $1,200/year estimated",
      "Risk buffer: 5% for contingencies",
    ],
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
    maxWeightLbs: 5000,
    capacityDescription: "1500-3000 lbs",
    assumptions: [
      "Fuel price: $3.60/gallon",
      "Average MPG: 15.5 (better efficiency)",
      "Maintenance: higher due to complexity",
      "Depreciation: 5-year useful life",
      "Insurance: $1,500/year estimated",
      "Risk buffer: 6% for contingencies",
    ],
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
    maxWeightLbs: 10000,
    capacityDescription: "3000-8000 lbs",
    assumptions: [
      "Fuel price: $3.60/gallon",
      "Average MPG: 10.5 (lower efficiency)",
      "Maintenance: higher due to size",
      "Depreciation: 5-year useful life",
      "Insurance: $2,000/year estimated",
      "Risk buffer: 8% for contingencies",
    ],
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
    maxWeightLbs: 80000,
    capacityDescription: "40000+ lbs",
    assumptions: [
      "Fuel price: $3.60/gallon",
      "Average MPG: 7.0 (heavy load)",
      "Maintenance: significant due to complexity",
      "Depreciation: 5-year useful life",
      "Insurance: $3,500/year estimated",
      "Risk buffer: 10% for contingencies",
    ],
  },
};

/**
 * Get vehicle profile by type, with fallback to cargo_van
 */
export function getVehicleProfile(vehicleType?: VehicleType): VehicleProfile {
  if (!vehicleType || !VEHICLE_PROFILES[vehicleType]) {
    return VEHICLE_PROFILES.cargo_van;
  }
  return VEHICLE_PROFILES[vehicleType];
}

/**
 * Safe number guard - prevents NaN leaks
 */
function safeNumber(value: any, fallback: number = 0): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

/**
 * Calculate fuel cost for a trip
 * 
 * @param miles - Total miles
 * @param fuelPricePerGallon - Fuel price (default: $3.60)
 * @param mpg - Vehicle MPG (default: from profile)
 * @returns Fuel cost in dollars
 */
export function calculateFuelCost(
  miles: number,
  fuelPricePerGallon: number = 3.6,
  mpg: number = 12.9
): number {
  const safeMiles = safeNumber(miles, 0);
  const safePrice = safeNumber(fuelPricePerGallon, 3.6);
  const safeMpg = safeNumber(mpg, 12.9);

  if (safeMiles <= 0 || safeMpg <= 0) return 0;

  const gallonsNeeded = safeMiles / safeMpg;
  return Math.round(gallonsNeeded * safePrice * 100) / 100;
}

/**
 * Calculate maintenance reserve for a trip
 * 
 * @param miles - Total miles
 * @param maintenancePerMile - Cost per mile (default: $0.12)
 * @returns Maintenance reserve in dollars
 */
export function calculateMaintenanceReserve(
  miles: number,
  maintenancePerMile: number = 0.12
): number {
  const safeMiles = safeNumber(miles, 0);
  const safeRate = safeNumber(maintenancePerMile, 0.12);

  if (safeMiles <= 0) return 0;

  return Math.round(safeMiles * safeRate * 100) / 100;
}

/**
 * Calculate tire reserve for a trip
 * 
 * @param miles - Total miles
 * @param tirePerMile - Cost per mile (default: $0.05)
 * @returns Tire reserve in dollars
 */
export function calculateTireReserve(
  miles: number,
  tirePerMile: number = 0.05
): number {
  const safeMiles = safeNumber(miles, 0);
  const safeRate = safeNumber(tirePerMile, 0.05);

  if (safeMiles <= 0) return 0;

  return Math.round(safeMiles * safeRate * 100) / 100;
}

/**
 * Calculate depreciation cost for a trip
 * 
 * @param miles - Total miles
 * @param depreciationPerMile - Cost per mile (default: $0.35)
 * @returns Depreciation cost in dollars
 */
export function calculateDepreciationCost(
  miles: number,
  depreciationPerMile: number = 0.35
): number {
  const safeMiles = safeNumber(miles, 0);
  const safeRate = safeNumber(depreciationPerMile, 0.35);

  if (safeMiles <= 0) return 0;

  return Math.round(safeMiles * safeRate * 100) / 100;
}

/**
 * Calculate insurance exposure for a trip
 * 
 * @param miles - Total miles
 * @param insurancePerMile - Cost per mile (default: $0.10)
 * @returns Insurance exposure in dollars
 */
export function calculateInsuranceExposure(
  miles: number,
  insurancePerMile: number = 0.10
): number {
  const safeMiles = safeNumber(miles, 0);
  const safeRate = safeNumber(insurancePerMile, 0.10);

  if (safeMiles <= 0) return 0;

  return Math.round(safeMiles * safeRate * 100) / 100;
}

/**
 * Calculate risk buffer for a trip
 * 
 * @param miles - Total miles
 * @param riskBufferPerMile - Cost per mile (default: $0.05)
 * @returns Risk buffer in dollars
 */
export function calculateRiskBuffer(
  miles: number,
  riskBufferPerMile: number = 0.05
): number {
  const safeMiles = safeNumber(miles, 0);
  const safeRate = safeNumber(riskBufferPerMile, 0.05);

  if (safeMiles <= 0) return 0;

  return Math.round(safeMiles * safeRate * 100) / 100;
}

/**
 * Calculate total operating cost per mile
 * 
 * @param vehicleType - Vehicle type (default: cargo_van)
 * @returns Cost per mile in dollars
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
 * Calculate vehicle operating cost for a trip
 * 
 * @param miles - Total miles
 * @param vehicleType - Vehicle type (default: cargo_van)
 * @returns Total operating cost in dollars
 */
export function calculateVehicleOperatingCost(
  miles: number,
  vehicleType?: VehicleType
): number {
  const safeMiles = safeNumber(miles, 0);
  if (safeMiles <= 0) return 0;

  const costPerMile = calculateCostPerMile(vehicleType);
  return Math.round(safeMiles * costPerMile * 100) / 100;
}

/**
 * Build detailed cost breakdown for a trip
 * 
 * @param miles - Total miles
 * @param vehicleType - Vehicle type (default: cargo_van)
 * @returns Detailed breakdown of all costs
 */
export function buildVehicleCostBreakdown(
  miles: number,
  vehicleType?: VehicleType
) {
  const profile = getVehicleProfile(vehicleType);
  const safeMiles = safeNumber(miles, 0);

  return {
    miles: safeMiles,
    vehicleType: profile.id,
    vehicleLabel: profile.label,
    fuel: calculateFuelCost(safeMiles, 3.6, profile.mpg),
    maintenance: calculateMaintenanceReserve(safeMiles, profile.maintenancePerMile),
    tires: calculateTireReserve(safeMiles, profile.tirePerMile),
    depreciation: calculateDepreciationCost(safeMiles, profile.depreciationPerMile),
    insurance: calculateInsuranceExposure(safeMiles, profile.insuranceExposurePerMile),
    riskBuffer: calculateRiskBuffer(safeMiles, profile.riskBufferPerMile),
    total: calculateVehicleOperatingCost(safeMiles, vehicleType),
    costPerMile: calculateCostPerMile(vehicleType),
  };
}

/**
 * Calculate profitability assessment
 * 
 * @param revenue - Revenue from load (dollars)
 * @param miles - Total miles
 * @param tolls - Toll costs (dollars, default: 0)
 * @param vehicleType - Vehicle type (default: cargo_van)
 * @returns Profitability assessment with confidence and assumptions
 */
export function calculateProfitability(
  revenue: number,
  miles: number,
  tolls: number = 0,
  vehicleType?: VehicleType
) {
  const safeRevenue = safeNumber(revenue, 0);
  const safeMiles = safeNumber(miles, 0);
  const safeTolls = safeNumber(tolls, 0);

  // Validate inputs
  if (safeMiles <= 0) {
    return {
      revenue: safeRevenue,
      operatingCost: 0,
      tolls: safeTolls,
      profit: 0,
      profitMargin: 0,
      ratePerMile: 0,
      confidence: "low" as const,
      blocked: true,
      blockedReason: "Invalid miles",
      assumptions: [],
    };
  }

  if (safeRevenue <= 0) {
    return {
      revenue: safeRevenue,
      operatingCost: calculateVehicleOperatingCost(safeMiles, vehicleType),
      tolls: safeTolls,
      profit: -calculateVehicleOperatingCost(safeMiles, vehicleType) - safeTolls,
      profitMargin: -100,
      ratePerMile: 0,
      confidence: "low" as const,
      blocked: true,
      blockedReason: "Invalid revenue",
      assumptions: [],
    };
  }

  const operatingCost = calculateVehicleOperatingCost(safeMiles, vehicleType);
  const totalCost = operatingCost + safeTolls;
  const profit = safeRevenue - totalCost;
  const profitMargin = safeRevenue > 0 ? (profit / safeRevenue) * 100 : 0;
  const ratePerMile = safeMiles > 0 ? safeRevenue / safeMiles : 0;

  const profile = getVehicleProfile(vehicleType);

  return {
    revenue: safeRevenue,
    operatingCost: Math.round(operatingCost * 100) / 100,
    tolls: safeTolls,
    profit: Math.round(profit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    ratePerMile: Math.round(ratePerMile * 100) / 100,
    confidence: "high" as const,
    blocked: false,
    blockedReason: null,
    assumptions: profile.assumptions,
  };
}

/**
 * Build complete profitability assessment with breakdown
 * 
 * @param revenue - Revenue from load (dollars)
 * @param miles - Total miles
 * @param tolls - Toll costs (dollars, default: 0)
 * @param vehicleType - Vehicle type (default: cargo_van)
 * @returns Complete assessment with cost breakdown
 */
export function buildProfitabilityAssessment(
  revenue: number,
  miles: number,
  tolls: number = 0,
  vehicleType?: VehicleType
) {
  const profitability = calculateProfitability(revenue, miles, tolls, vehicleType);
  const costBreakdown = buildVehicleCostBreakdown(miles, vehicleType);

  return {
    ...profitability,
    costBreakdown,
  };
}
