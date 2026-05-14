/**
 * vehicle-costs.ts
 * 
 * COMPATIBILITY WRAPPER - Routes to canonical engine
 * 
 * This file exists for backward compatibility only.
 * All new code should import directly from:
 * ./core/financial/vehicle-cost-engine.ts
 * 
 * This wrapper ensures old imports continue to work while routing to the canonical engine.
 */

import {
  calculateVehicleOperatingCost as canonicalCalculateVehicleOperatingCost,
  calculateFuelCost,
  calculateMaintenanceReserve,
  calculateTireReserve,
  calculateDepreciationCost,
  calculateInsuranceExposure,
  calculateRiskBuffer,
  calculateCostPerMile,
  buildVehicleCostBreakdown,
  buildProfitabilityAssessment,
  calculateProfitability,
  getVehicleProfile,
  VEHICLE_PROFILES as CANONICAL_VEHICLE_PROFILES,
  type VehicleType,
  type VehicleProfile,
} from "./core/financial/vehicle-cost-engine";

/**
 * DEPRECATED: Use canonical engine directly
 * 
 * Old signature: calculateVehicleOperatingCost(vehicleType, miles)
 * New signature: calculateVehicleOperatingCost(miles, vehicleType)
 * 
 * This wrapper handles the old signature for backward compatibility.
 */
export function calculateVehicleOperatingCost(
  vehicleTypeOrMiles: VehicleType | number,
  milesOrVehicleType?: number | VehicleType
): number {
  // Detect which signature is being used
  if (typeof vehicleTypeOrMiles === "string") {
    // Old signature: calculateVehicleOperatingCost(vehicleType, miles)
    const vehicleType = vehicleTypeOrMiles as VehicleType;
    const miles = milesOrVehicleType as number;
    return canonicalCalculateVehicleOperatingCost(miles, vehicleType);
  } else {
    // New signature: calculateVehicleOperatingCost(miles, vehicleType)
    const miles = vehicleTypeOrMiles as number;
    const vehicleType = (milesOrVehicleType as VehicleType) || "cargo_van";
    return canonicalCalculateVehicleOperatingCost(miles, vehicleType);
  }
}

/**
 * Re-export all canonical functions and types
 */
export {
  calculateFuelCost,
  calculateMaintenanceReserve,
  calculateTireReserve,
  calculateDepreciationCost,
  calculateInsuranceExposure,
  calculateRiskBuffer,
  calculateCostPerMile,
  buildVehicleCostBreakdown,
  buildProfitabilityAssessment,
  calculateProfitability,
  getVehicleProfile,
  type VehicleType,
  type VehicleProfile,
};

/**
 * Re-export vehicle profiles from canonical engine
 */
export const VEHICLE_PROFILES = CANONICAL_VEHICLE_PROFILES;
