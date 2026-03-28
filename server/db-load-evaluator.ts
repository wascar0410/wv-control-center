import { eq } from "drizzle-orm";
import { loadQuotations, users } from "../drizzle/schema";
import { getDb } from "./db";
import { getBusinessConfig, getDistanceSurcharges, getWeightSurcharges } from "./db-business-config";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvaluationForm = {
  brokerName: string;
  clientName: string;
  origin: string;
  destination: string;
  offeredPrice: number;
  loadedMiles: number;
  deadheadMiles: number;
  weightLbs: number;
  pickupDate?: string;
  deliveryDate?: string;
  notes: string;
};

export type BusinessConfig = {
  fuelPricePerGallon: number;
  vanMpg: number;
  maintenancePerMile: number;
  tiresPerMile: number;
  insuranceMonthly: number;
  phoneInternetMonthly: number;
  loadBoardAppsMonthly: number;
  accountingSoftwareMonthly: number;
  otherFixedMonthly: number;
  targetMilesPerMonth: number;
  minimumProfitPerMile: number;
};

export type DistanceRule = {
  id: number;
  fromMiles: number;
  surchargePerMile: number;
};

export type WeightRule = {
  id: number;
  fromLbs: number;
  surchargePerMile: number;
};

export type Decision = "ACCEPT" | "NEGOTIATE" | "REJECT";

export type EvaluationResult = {
  totalMiles: number;
  fuelCostPerMile: number;
  variableCostPerMile: number;
  fixedCostPerMile: number;
  totalCostPerMile: number;
  distanceSurchargePerMile: number;
  weightSurchargePerMile: number;
  recommendedMinRatePerMile: number;
  offeredRatePerMile: number;
  totalEstimatedCost: number;
  estimatedProfit: number;
  estimatedProfitPerMile: number;
  estimatedMarginPercent: number;
  minimumTargetProfit: number;
  decision: Decision;
  decisionReason: string;
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getApplicableDistanceSurcharge(miles: number, rules: DistanceRule[]): number {
  const ordered = [...rules].sort((a, b) => a.fromMiles - b.fromMiles);
  let match = 0;
  for (const rule of ordered) {
    if (miles >= rule.fromMiles) match = Number(rule.surchargePerMile);
  }
  return match;
}

function getApplicableWeightSurcharge(weight: number, rules: WeightRule[]): number {
  const ordered = [...rules].sort((a, b) => a.fromLbs - b.fromLbs);
  let match = 0;
  for (const rule of ordered) {
    if (weight >= rule.fromLbs) match = Number(rule.surchargePerMile);
  }
  return match;
}

// ─── Main Evaluation Function ─────────────────────────────────────────────────

export function evaluateLoad(
  form: EvaluationForm,
  config: BusinessConfig,
  distanceRules: DistanceRule[],
  weightRules: WeightRule[]
): EvaluationResult {
  const offeredPrice = Math.max(0, form.offeredPrice);
  const loadedMiles = Math.max(0, form.loadedMiles);
  const deadheadMiles = Math.max(0, form.deadheadMiles);
  const weightLbs = Math.max(0, form.weightLbs);
  const totalMiles = loadedMiles + deadheadMiles;

  // Calculate fuel cost per mile
  const fuelCostPerMile = config.vanMpg > 0 ? config.fuelPricePerGallon / config.vanMpg : 0;
  
  // Calculate variable cost per mile (fuel + maintenance + tires)
  const variableCostPerMile = fuelCostPerMile + config.maintenancePerMile + config.tiresPerMile;
  
  // Calculate fixed cost per mile
  const monthlyFixed =
    config.insuranceMonthly +
    config.phoneInternetMonthly +
    config.loadBoardAppsMonthly +
    config.accountingSoftwareMonthly +
    config.otherFixedMonthly;
  const fixedCostPerMile = config.targetMilesPerMonth > 0 ? monthlyFixed / config.targetMilesPerMonth : 0;
  
  // Total cost per mile
  const totalCostPerMile = variableCostPerMile + fixedCostPerMile;

  // Get applicable surcharges
  const distanceSurchargePerMile = getApplicableDistanceSurcharge(loadedMiles, distanceRules);
  const weightSurchargePerMile = getApplicableWeightSurcharge(weightLbs, weightRules);
  
  // Recommended minimum rate per mile
  const recommendedMinRatePerMile =
    totalCostPerMile + config.minimumProfitPerMile + distanceSurchargePerMile + weightSurchargePerMile;

  // Calculate offered rate per mile
  const offeredRatePerMile = totalMiles > 0 ? offeredPrice / totalMiles : 0;
  
  // Calculate profit metrics
  const totalEstimatedCost = totalMiles * totalCostPerMile;
  const estimatedProfit = offeredPrice - totalEstimatedCost;
  const estimatedProfitPerMile = totalMiles > 0 ? estimatedProfit / totalMiles : 0;
  const estimatedMarginPercent = offeredPrice > 0 ? (estimatedProfit / offeredPrice) * 100 : 0;
  const minimumTargetProfit = totalMiles * config.minimumProfitPerMile;

  // Determine decision
  let decision: Decision = "REJECT";
  let decisionReason = "La carga no alcanza la utilidad mínima configurada.";

  if (offeredRatePerMile >= recommendedMinRatePerMile && estimatedProfitPerMile >= config.minimumProfitPerMile) {
    decision = "ACCEPT";
    decisionReason = "La carga supera el mínimo recomendado y deja utilidad saludable.";
  } else if (
    offeredRatePerMile >= recommendedMinRatePerMile * 0.9 ||
    estimatedProfitPerMile >= config.minimumProfitPerMile * 0.7
  ) {
    decision = "NEGOTIATE";
    decisionReason = "Está cerca del objetivo. Conviene negociar mejor tarifa o reducir millas vacías.";
  }

  return {
    totalMiles,
    fuelCostPerMile,
    variableCostPerMile,
    fixedCostPerMile,
    totalCostPerMile,
    distanceSurchargePerMile,
    weightSurchargePerMile,
    recommendedMinRatePerMile,
    offeredRatePerMile,
    totalEstimatedCost,
    estimatedProfit,
    estimatedProfitPerMile,
    estimatedMarginPercent,
    minimumTargetProfit,
    decision,
    decisionReason,
  };
}

// ─── Database Functions ───────────────────────────────────────────────────────

export async function evaluateLoadWithUserConfig(
  userId: number,
  form: EvaluationForm
): Promise<EvaluationResult> {
  // Get user's business config
  const configRaw = await getBusinessConfig(userId);
  if (!configRaw) {
    throw new Error("Business configuration not found for user");
  }

  // Convert config to proper types
  const config: BusinessConfig = {
    fuelPricePerGallon: typeof configRaw.fuelPricePerGallon === 'string' ? parseFloat(configRaw.fuelPricePerGallon) : (configRaw.fuelPricePerGallon || 0),
    vanMpg: typeof configRaw.vanMpg === 'string' ? parseFloat(configRaw.vanMpg) : (configRaw.vanMpg || 0),
    maintenancePerMile: typeof configRaw.maintenancePerMile === 'string' ? parseFloat(configRaw.maintenancePerMile) : (configRaw.maintenancePerMile || 0),
    tiresPerMile: typeof configRaw.tiresPerMile === 'string' ? parseFloat(configRaw.tiresPerMile) : (configRaw.tiresPerMile || 0),
    insuranceMonthly: typeof configRaw.insuranceMonthly === 'string' ? parseFloat(configRaw.insuranceMonthly) : (configRaw.insuranceMonthly || 0),
    phoneInternetMonthly: typeof configRaw.phoneInternetMonthly === 'string' ? parseFloat(configRaw.phoneInternetMonthly) : (configRaw.phoneInternetMonthly || 0),
    loadBoardAppsMonthly: typeof configRaw.loadBoardAppsMonthly === 'string' ? parseFloat(configRaw.loadBoardAppsMonthly) : (configRaw.loadBoardAppsMonthly || 0),
    accountingSoftwareMonthly: typeof configRaw.accountingSoftwareMonthly === 'string' ? parseFloat(configRaw.accountingSoftwareMonthly) : (configRaw.accountingSoftwareMonthly || 0),
    otherFixedMonthly: typeof configRaw.otherFixedMonthly === 'string' ? parseFloat(configRaw.otherFixedMonthly) : (configRaw.otherFixedMonthly || 0),
    targetMilesPerMonth: typeof configRaw.targetMilesPerMonth === 'string' ? parseInt(configRaw.targetMilesPerMonth) : (configRaw.targetMilesPerMonth || 0),
    minimumProfitPerMile: typeof configRaw.minimumProfitPerMile === 'string' ? parseFloat(configRaw.minimumProfitPerMile) : (configRaw.minimumProfitPerMile || 0),
  };

  // Get user's surcharge rules
  const distanceRulesRaw = await getDistanceSurcharges(userId);
  const weightRulesRaw = await getWeightSurcharges(userId);

  // Convert to proper types (surchargePerMile might be string from DB)
  const distanceRules: DistanceRule[] = distanceRulesRaw.map((r: any) => ({
    id: r.id,
    fromMiles: r.fromMiles,
    surchargePerMile: typeof r.surchargePerMile === 'string' ? parseFloat(r.surchargePerMile) : r.surchargePerMile
  }));

  const weightRules: WeightRule[] = weightRulesRaw.map((r: any) => ({
    id: r.id,
    fromLbs: r.fromLbs,
    surchargePerMile: typeof r.surchargePerMile === 'string' ? parseFloat(r.surchargePerMile) : r.surchargePerMile
  }));

  // Evaluate the load
  return evaluateLoad(form, config, distanceRules, weightRules);
}

export async function saveEvaluatedLoad(
  userId: number,
  form: EvaluationForm,
  evaluation: EvaluationResult
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Save as a load quotation
  const result = await db.insert(loadQuotations).values({
    userId,
    vanLat: "0",
    vanLng: "0",
    vanAddress: form.origin,
    pickupLat: "0",
    pickupLng: "0",
    pickupAddress: form.origin,
    deliveryLat: "0",
    deliveryLng: "0",
    deliveryAddress: form.destination,
    weight: form.weightLbs.toString(),
    weightUnit: "lbs",
    cargoDescription: form.notes,
    emptyMiles: form.deadheadMiles.toString(),
    loadedMiles: form.loadedMiles.toString(),
    returnEmptyMiles: "0",
    totalMiles: evaluation.totalMiles.toString(),
    ratePerMile: evaluation.offeredRatePerMile.toFixed(2),
    fuelSurcharge: "0",
    totalPrice: form.offeredPrice.toFixed(2),
    estimatedFuelCost: (evaluation.fuelCostPerMile * evaluation.totalMiles).toFixed(2),
    estimatedOperatingCost: (evaluation.totalCostPerMile * evaluation.totalMiles).toFixed(2),
    estimatedProfit: evaluation.estimatedProfit.toFixed(2),
    profitMarginPercent: evaluation.estimatedMarginPercent.toFixed(2),
    status: evaluation.decision === "ACCEPT" ? "accepted" : evaluation.decision === "NEGOTIATE" ? "pending" : "rejected",
    createdAt: new Date(),
  } as any);

  return result;
}
