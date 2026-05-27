/**
 * Driver Load Economics Utility - V2
 * 
 * V2 Frontend-only calculations for estimated driver earnings with:
 * - Fuel costs (vehicle type based)
 * - Maintenance costs (vehicle type based)
 * - Tolls
 * - Complete cost breakdown
 * 
 * All values are ESTIMATES and do NOT affect real payments.
 * Real payments are calculated in Wallet/Settlements.
 */

export type VehicleType = "cargo_van" | "sprinter" | "box_truck" | "default";

export interface VehicleCosts {
  fuelCostPerMile: number;
  maintenanceCostPerMile: number;
  totalCostPerMile: number;
}

export interface LoadEconomics {
  // Gross pay
  grossPay: number | null;
  
  // Distance
  totalMiles: number | null;
  
  // Vehicle type and costs
  vehicleType: VehicleType;
  fuelCostPerMile: number;
  maintenanceCostPerMile: number;
  totalCostPerMile: number;
  
  // Cost breakdown
  fuelCost: number | null;
  maintenanceCost: number | null;
  tolls: number | null;
  estimatedTotalCost: number | null;
  
  // Net pay
  netPay: number | null;
  
  // Time estimates
  estimatedDriveMinutes: number | null;
  serviceMinutes: number;
  bufferMinutes: number;
  estimatedTotalMinutes: number | null;
  
  // Rates
  hourlyRate: number | null;
  payPerMile: number | null;
  
  // Score
  profitabilityScore: ProfitabilityScore;
}

export type ProfitabilityScore = "excellent" | "good" | "caution" | "low" | "unknown";

export interface LoadEconomicsInput {
  driverPay?: number | string;
  price?: number | string;
  totalMiles?: number | string;
  miles?: number | string;
  itemCount?: number;
  estimatedFuel?: number | string;
  estimatedTolls?: number | string;
  tolls?: number | string;
  tollAmount?: number | string;
  tollCost?: number | string;
  vehicleType?: VehicleType;
}

// Vehicle cost profiles (fuel + maintenance per mile)
const VEHICLE_COSTS: Record<VehicleType, VehicleCosts> = {
  cargo_van: {
    fuelCostPerMile: 0.22,
    maintenanceCostPerMile: 0.12,
    totalCostPerMile: 0.34,
  },
  sprinter: {
    fuelCostPerMile: 0.28,
    maintenanceCostPerMile: 0.16,
    totalCostPerMile: 0.44,
  },
  box_truck: {
    fuelCostPerMile: 0.45,
    maintenanceCostPerMile: 0.25,
    totalCostPerMile: 0.70,
  },
  default: {
    fuelCostPerMile: 0.22,
    maintenanceCostPerMile: 0.12,
    totalCostPerMile: 0.34,
  },
};

const DEFAULTS = {
  serviceMinutesPerItem: 1.1,
  bufferMinutes: 5,
  minimumEstimatedMinutes: 15,
  estimatedDriveSpeedMph: 40,
};

/**
 * Calculate profitability score based on hourly rate
 */
function calculateProfitabilityScore(hourlyRate: number | null): ProfitabilityScore {
  if (hourlyRate === null) return "unknown";
  if (hourlyRate >= 30) return "excellent";
  if (hourlyRate >= 22) return "good";
  if (hourlyRate >= 16) return "caution";
  return "low";
}

/**
 * Get color for profitability score
 */
export function getScoreColor(score: ProfitabilityScore): string {
  switch (score) {
    case "excellent":
      return "bg-green-100 text-green-900 border-green-300";
    case "good":
      return "bg-blue-100 text-blue-900 border-blue-300";
    case "caution":
      return "bg-yellow-100 text-yellow-900 border-yellow-300";
    case "low":
      return "bg-red-100 text-red-900 border-red-300";
    default:
      return "bg-gray-100 text-gray-900 border-gray-300";
  }
}

/**
 * Get label for profitability score
 */
export function getScoreLabel(score: ProfitabilityScore): string {
  switch (score) {
    case "excellent":
      return "Excelente";
    case "good":
      return "Buena";
    case "caution":
      return "Precaución";
    case "low":
      return "Baja";
    default:
      return "Desconocida";
  }
}

/**
 * Calculate driver load economics - V2
 * 
 * V2 Formula:
 * - grossPay: load.driverPay || load.price
 * - totalMiles: load.totalMiles || load.miles || null
 * - fuelCost: totalMiles * fuelCostPerMile (vehicle type based)
 * - maintenanceCost: totalMiles * maintenanceCostPerMile (vehicle type based)
 * - tolls: load.tolls || load.tollAmount || load.tollCost || load.estimatedTolls || 0
 * - estimatedTotalCost: fuelCost + maintenanceCost + tolls
 * - netPay: grossPay - estimatedTotalCost
 * - hourlyRate: (netPay / estimatedTotalMinutes) * 60
 * - payPerMile: netPay / totalMiles
 * - profitabilityScore: based on hourlyRate
 */
export function calculateLoadEconomics(input: LoadEconomicsInput): LoadEconomics {
  // Gross pay: use driverPay if available, else price
  const grossPay = input.driverPay
    ? Number(input.driverPay)
    : input.price
    ? Number(input.price)
    : null;

  // Total miles: use totalMiles, else miles, else null
  let totalMiles: number | null = null;
  if (input.totalMiles) {
    totalMiles = Number(input.totalMiles);
  } else if (input.miles) {
    totalMiles = Number(input.miles);
  }

  // Validate miles is a valid number
  if (totalMiles !== null && !Number.isFinite(totalMiles)) {
    totalMiles = null;
  }

  // Vehicle type (default to cargo_van)
  const vehicleType: VehicleType = input.vehicleType || "cargo_van";
  const vehicleCosts = VEHICLE_COSTS[vehicleType];

  // Fuel cost: totalMiles * fuelCostPerMile
  const fuelCost = totalMiles !== null ? totalMiles * vehicleCosts.fuelCostPerMile : null;

  // Maintenance cost: totalMiles * maintenanceCostPerMile
  const maintenanceCost = totalMiles !== null ? totalMiles * vehicleCosts.maintenanceCostPerMile : null;

  // Tolls: try multiple field names
  let tolls: number | null = null;
  if (input.tolls) {
    tolls = Number(input.tolls);
  } else if (input.tollAmount) {
    tolls = Number(input.tollAmount);
  } else if (input.tollCost) {
    tolls = Number(input.tollCost);
  } else if (input.estimatedTolls) {
    tolls = Number(input.estimatedTolls);
  } else {
    tolls = 0;
  }

  // Validate tolls
  if (tolls !== null && !Number.isFinite(tolls)) {
    tolls = 0;
  }

  // Estimated total cost: fuelCost + maintenanceCost + tolls
  let estimatedTotalCost: number | null = null;
  if (fuelCost !== null && maintenanceCost !== null) {
    estimatedTotalCost = fuelCost + maintenanceCost + tolls;
  }

  // Net pay: grossPay - estimatedTotalCost
  const netPay =
    estimatedTotalCost !== null && grossPay !== null ? grossPay - estimatedTotalCost : grossPay;

  // Estimated drive minutes: totalMiles / 40 * 60
  const estimatedDriveMinutes =
    totalMiles !== null ? (totalMiles / DEFAULTS.estimatedDriveSpeedMph) * 60 : null;

  // Service minutes: itemCount * 1.1, or 15 if no itemCount
  const serviceMinutes = input.itemCount
    ? input.itemCount * DEFAULTS.serviceMinutesPerItem
    : DEFAULTS.minimumEstimatedMinutes;

  // Buffer minutes
  const bufferMinutes = DEFAULTS.bufferMinutes;

  // Estimated total minutes
  let estimatedTotalMinutes: number | null = null;
  if (estimatedDriveMinutes !== null) {
    estimatedTotalMinutes = Math.max(
      estimatedDriveMinutes + serviceMinutes + bufferMinutes,
      DEFAULTS.minimumEstimatedMinutes
    );
  }

  // Hourly rate: (netPay / estimatedTotalMinutes) * 60
  const hourlyRate =
    estimatedTotalMinutes !== null && netPay !== null
      ? (netPay / estimatedTotalMinutes) * 60
      : null;

  // Pay per mile: netPay / totalMiles
  const payPerMile =
    totalMiles !== null && netPay !== null ? netPay / totalMiles : null;

  // Profitability score
  const profitabilityScore = calculateProfitabilityScore(hourlyRate);

  return {
    grossPay,
    totalMiles,
    vehicleType,
    fuelCostPerMile: vehicleCosts.fuelCostPerMile,
    maintenanceCostPerMile: vehicleCosts.maintenanceCostPerMile,
    totalCostPerMile: vehicleCosts.totalCostPerMile,
    fuelCost,
    maintenanceCost,
    tolls,
    estimatedTotalCost,
    netPay,
    estimatedDriveMinutes,
    serviceMinutes,
    bufferMinutes,
    estimatedTotalMinutes,
    hourlyRate,
    payPerMile,
    profitabilityScore,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number | null): string {
  if (value === null) return "No disponible";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format miles for display
 */
export function formatMiles(value: number | null): string {
  if (value === null) return "No disponible";
  return `${value.toFixed(1)} mi`;
}

/**
 * Format time for display
 */
export function formatTime(minutes: number | null): string {
  if (minutes === null) return "No disponible";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Format hourly rate for display
 */
export function formatHourlyRate(value: number | null): string {
  if (value === null) return "No disponible";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
  }).format(value) + "/h";
}

/**
 * Get explanation text for calculations
 */
export function getCalculationExplanation(): string {
  return `
Estos son valores ESTIMADOS basados en:
- Distancia: calculada desde coordenadas
- Combustible: según tipo de vehículo
- Mantenimiento: según tipo de vehículo
- Peajes: incluidos en la carga
- Tiempo: estimado a 40 mph promedio + 1.1 min por artículo

El pago final se calcula en Wallet/Settlements.
No es la liquidación oficial.
  `.trim();
}
