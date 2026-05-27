/**
 * Driver Load Economics Utility
 * 
 * V1 Frontend-only calculations for estimated driver earnings.
 * All values are ESTIMATES and do NOT affect real payments.
 * Real payments are calculated in Wallet/Settlements.
 */

export interface LoadEconomics {
  grossPay: number | null;
  totalMiles: number | null;
  vehicleCostPerMile: number;
  vehicleCost: number | null;
  netPay: number | null;
  estimatedDriveMinutes: number | null;
  serviceMinutes: number;
  bufferMinutes: number;
  estimatedTotalMinutes: number | null;
  hourlyRate: number | null;
  payPerMile: number | null;
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
}

const DEFAULTS = {
  vehicleCostPerMile: 0.179,
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
 * Calculate driver load economics
 * 
 * V1 Formula:
 * - grossPay: load.driverPay || load.price
 * - totalMiles: load.totalMiles || load.miles || null (NO DEFAULT 120)
 * - vehicleCost: totalMiles * 0.179
 * - netPay: grossPay - vehicleCost
 * - estimatedDriveMinutes: totalMiles / 40 * 60
 * - serviceMinutes: itemCount * 1.1 || 15
 * - estimatedTotalMinutes: max(driveMinutes + serviceMinutes + 5, 15)
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

  // Total miles: use totalMiles, else miles, else null (NO DEFAULT 120)
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

  // Vehicle cost
  const vehicleCostPerMile = DEFAULTS.vehicleCostPerMile;
  const vehicleCost = totalMiles !== null ? totalMiles * vehicleCostPerMile : null;

  // Net pay: grossPay - vehicleCost (if vehicleCost exists)
  const netPay =
    vehicleCost !== null && grossPay !== null ? grossPay - vehicleCost : grossPay;

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
    vehicleCostPerMile,
    vehicleCost,
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
- Tiempo: estimado a 40 mph promedio + 1.1 min por artículo
- Costo vehículo: $0.179 por milla (cargo van)

El pago final se calcula en Wallet/Settlements.
No es la liquidación oficial.
  `.trim();
}
