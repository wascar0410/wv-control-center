/**
 * load-advisor.ts
 * Professional AI Load Advisor - Broker/Dispatcher Level
 * 
 * PRO VERSION: Profit-based analysis + Real cost calculations with vehicle operating costs
 * 
 * Analyzes loads with real market logic:
 * - Profit filtering (must be positive)
 * - Real cost analysis (vehicle operating costs + tolls)
 * - Dynamic pricing recommendations
 * - Risk detection
 * - Confidence scoring
 */

import { calculateOperatingCosts } from "./vehicle-costs";

export interface LoadAnalysis {
  miles: number;
  price: number;
  ratePerMile: number;
  profit: number;
  recommendation: "GOOD" | "NEGOTIATE" | "REJECT" | "UNKNOWN";
  confidence: "high" | "medium" | "low";
  suggestedMinimum: number;
  suggestedTarget: number;
  riskFlags: string[];
  reasoning: string;
  block?: boolean; // If true, do not use this load for AI decisions
}

/**
 * Market-based RPM thresholds (van cargo)
 * Adjust these based on your market conditions
 */
const MARKET_THRESHOLDS = {
  FLOOR: 1.8,      // Below this = reject
  AVERAGE: 2.2,    // Minimum acceptable
  GOOD: 2.8,       // Good deal
  PREMIUM: 3.5,    // Excellent deal
};

/**
 * Profit thresholds (minimum acceptable profit per load)
 */
const PROFIT_THRESHOLDS = {
  MINIMUM: 50,     // Reject if profit < $50
  NEGOTIATE: 100,  // Negotiate if profit < $100
  GOOD: 200,       // Good if profit > $200
};

/**
 * Dynamic multiplier for pricing recommendations
 * Short loads command premium, long haul accepts lower margin
 */
function getDynamicMultiplier(miles: number): number {
  if (miles < 80) return 1.25;   // Short loads = 25% buffer
  if (miles < 200) return 1.15;  // Medium = 15% buffer
  return 1.08;                   // Long haul = 8% buffer
}

/**
 * Detect risk flags in load
 */
function detectRisks(load: any): string[] {
  const risks: string[] = [];

  const rpm = load.ratePerMile || 0;
  const miles = load.miles || 0;
  const profit = load.profit || 0;
  const hasCoords = load.pickupLat && load.deliveryLat;

  if (rpm < 2) risks.push("LOW_PAY");
  if (rpm < 1.8) risks.push("CRITICAL_LOW_PAY");
  if (profit < 50) risks.push("LOW_PROFIT");
  if (profit <= 0) risks.push("NEGATIVE_PROFIT");
  if (miles < 50) risks.push("SHORT_LOAD");
  if (miles > 500) risks.push("LONG_HAUL");
  if (!hasCoords) risks.push("NO_COORDS");
  if (!load.pickupAddress || !load.deliveryAddress) risks.push("INCOMPLETE_ADDRESS");

  return risks;
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(analysis: Partial<LoadAnalysis>, load: any): string {
  const { recommendation, ratePerMile, miles, profit } = analysis;
  const riskFlags = analysis.riskFlags || [];

  if (riskFlags.includes("NO_COORDS")) {
    return "Cannot evaluate: missing coordinates. Address validation required.";
  }

  if (riskFlags.includes("NEGATIVE_PROFIT")) {
    return `Load loses money. Profit: -$${Math.abs(profit || 0).toFixed(2)}. REJECT.`;
  }

  if (riskFlags.includes("LOW_PROFIT")) {
    return `Profit too low ($${profit?.toFixed(2)}). Need at least $${PROFIT_THRESHOLDS.MINIMUM}.`;
  }

  if (recommendation === "GOOD") {
    return `Excellent: $${ratePerMile?.toFixed(2)}/mi, $${profit?.toFixed(2)} profit on ${miles}mi. Accept or negotiate higher.`;
  }

  if (recommendation === "NEGOTIATE") {
    return `Fair deal: $${ratePerMile?.toFixed(2)}/mi, $${profit?.toFixed(2)} profit. Negotiate for better terms.`;
  }

  if (recommendation === "REJECT") {
    return `Below market. Rate $${ratePerMile?.toFixed(2)}/mi, profit $${profit?.toFixed(2)}. Recommend rejection.`;
  }

  return "Unable to analyze load.";
}

/**
 * Main analysis function - Professional Load Advisor
 * PRO VERSION: Profit-based + Real Cost Analysis
 * 
 * @param load Load object with miles, price, coordinates, addresses, costs
 * @returns Detailed load analysis with recommendation and pricing
 */
export function analyzeLoadAdvanced(load: any): LoadAnalysis {
  const miles = Number(load.miles) || 120;
  const price = Number(load.price) || 0;
  const ratePerMile = miles > 0 ? price / miles : 0;

  // 🚗 VEHICLE OPERATING COSTS - Professional calculation
  const vehicleType = load.vehicleType || "cargo_van";
  const operatingCosts = calculateOperatingCosts(miles, vehicleType);
  const estimatedTolls = Number(load.estimatedTolls) || 0;
  
  // Calculate REAL profit with vehicle operating costs
  const totalCosts = operatingCosts.totalForDistance + estimatedTolls;
  const profit = price - totalCosts;

  // Detect risk flags first
  const riskFlags = detectRisks({
    ...load,
    ratePerMile,
    profit,
    pickupLat: load.pickupLat,
    deliveryLat: load.deliveryLat,
    pickupAddress: load.pickupAddress,
    deliveryAddress: load.deliveryAddress,
  });

  // CRITICAL: If no valid coordinates, BLOCK this load from AI evaluation
  // Using fallback miles (120) leads to incorrect recommendations
  if (riskFlags.includes("NO_COORDS")) {
    return {
      miles,
      price,
      ratePerMile,
      profit,
      recommendation: "UNKNOWN",
      confidence: "low",
      suggestedMinimum: 0,
      suggestedTarget: 0,
      riskFlags,
      reasoning: "Cannot evaluate: missing coordinates. Address validation required.",
      block: true, // BLOCK: Do not use this load for AI decisions
    };
  }

  // PROFIT-BASED RECOMMENDATION (PRO LOGIC)
  let recommendation: "GOOD" | "NEGOTIATE" | "REJECT" = "REJECT";
  let confidence: "high" | "medium" | "low" = "low";

  // First filter: profit must be positive
  if (profit <= 0) {
    recommendation = "REJECT";
    confidence = "high";
  } else if (profit < PROFIT_THRESHOLDS.MINIMUM) {
    recommendation = "REJECT";
    confidence = "high";
  } else if (ratePerMile >= MARKET_THRESHOLDS.PREMIUM && profit > PROFIT_THRESHOLDS.GOOD) {
    // GOOD: High RPM AND good profit
    recommendation = "GOOD";
    confidence = "high";
  } else if (ratePerMile >= MARKET_THRESHOLDS.AVERAGE && profit > PROFIT_THRESHOLDS.NEGOTIATE) {
    // NEGOTIATE: Fair RPM AND acceptable profit
    recommendation = "NEGOTIATE";
    confidence = "medium";
  } else if (ratePerMile >= MARKET_THRESHOLDS.FLOOR && profit > PROFIT_THRESHOLDS.MINIMUM) {
    // REJECT: Low RPM, even with profit
    recommendation = "REJECT";
    confidence = "medium";
  } else {
    recommendation = "REJECT";
    confidence = "high";
  }

  // INTELLIGENT PRICING CALCULATION (based on real costs)
  const multiplier = getDynamicMultiplier(miles);
  // Minimum: cover costs + 2.5x margin
  const minimum = totalCosts > 0 ? totalCosts * 2.5 : miles * MARKET_THRESHOLDS.AVERAGE;
  // Target: minimum + negotiation buffer
  const target = minimum * multiplier;

  const reasoning = generateReasoning(
    { recommendation, ratePerMile, miles, profit },
    load
  );

  return {
    miles,
    price,
    ratePerMile: Number(ratePerMile.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    recommendation,
    confidence,
    suggestedMinimum: Number(minimum.toFixed(2)),
    suggestedTarget: Number(target.toFixed(2)),
    riskFlags,
    reasoning,
  };
}

/**
 * Get recommendation color for UI
 */
export function getRecommendationColor(
  recommendation: string
): "green" | "yellow" | "red" | "gray" {
  switch (recommendation) {
    case "GOOD":
      return "green";
    case "NEGOTIATE":
      return "yellow";
    case "REJECT":
      return "red";
    case "UNKNOWN":
      return "gray";
    default:
      return "gray";
  }
}

/**
 * Get recommendation emoji
 */
export function getRecommendationEmoji(recommendation: string): string {
  switch (recommendation) {
    case "GOOD":
      return "🟢";
    case "NEGOTIATE":
      return "🟡";
    case "REJECT":
      return "🔴";
    case "UNKNOWN":
      return "⚪";
    default:
      return "❓";
  }
}

/**
 * Format risk flags for display
 */
export function formatRiskFlags(flags: string[]): string {
  if (flags.length === 0) return "No risks detected";

  const riskLabels: Record<string, string> = {
    LOW_PAY: "⚠️ Low Pay",
    CRITICAL_LOW_PAY: "🚨 Critical Low Pay",
    LOW_PROFIT: "💸 Low Profit",
    NEGATIVE_PROFIT: "🚨 Negative Profit",
    SHORT_LOAD: "📦 Short Load",
    LONG_HAUL: "🛣️ Long Haul",
    NO_COORDS: "📍 No Coordinates",
    INCOMPLETE_ADDRESS: "🏠 Incomplete Address",
  };

  return flags.map((flag) => riskLabels[flag] || flag).join(" • ");
}
