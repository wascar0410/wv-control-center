/**
 * load-advisor.ts
 * Professional AI Load Advisor - Broker/Dispatcher Level
 * 
 * Analyzes loads with real market logic:
 * - Market-based RPM thresholds
 * - Dynamic pricing recommendations
 * - Risk detection
 * - Confidence scoring
 */

export interface LoadAnalysis {
  miles: number;
  price: number;
  ratePerMile: number;
  recommendation: "GOOD" | "NEGOTIATE" | "REJECT" | "UNKNOWN";
  confidence: "high" | "medium" | "low";
  suggestedMinimum: number;
  suggestedTarget: number;
  riskFlags: string[];
  reasoning: string;
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
  const hasCoords = load.pickupLat && load.deliveryLat;

  if (rpm < 2) risks.push("LOW_PAY");
  if (rpm < 1.8) risks.push("CRITICAL_LOW_PAY");
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
  const { recommendation, ratePerMile, miles } = analysis;
  const riskFlags = analysis.riskFlags || [];

  if (riskFlags.includes("NO_COORDS")) {
    return "Cannot evaluate: missing coordinates. Address validation required.";
  }

  if (recommendation === "GOOD") {
    return `Excellent rate at $${ratePerMile?.toFixed(2)}/mile for ${miles}mi. Accept or negotiate higher.`;
  }

  if (recommendation === "NEGOTIATE") {
    return `Fair rate. Negotiate for higher price or look for better loads.`;
  }

  if (recommendation === "REJECT") {
    if (riskFlags.includes("CRITICAL_LOW_PAY")) {
      return `Rate too low ($${ratePerMile?.toFixed(2)}/mi). Reject and look for better opportunities.`;
    }
    return `Below market rate. Recommend rejection or significant negotiation.`;
  }

  return "Unable to analyze load.";
}

/**
 * Main analysis function - Professional Load Advisor
 * 
 * @param load Load object with miles, price, coordinates, addresses
 * @returns Detailed load analysis with recommendation and pricing
 */
export function analyzeLoadAdvanced(load: any): LoadAnalysis {
  const miles = Number(load.miles) || 120;
  const price = Number(load.price) || 0;
  const ratePerMile = miles > 0 ? price / miles : 0;

  // Detect risk flags first
  const riskFlags = detectRisks({ ...load, ratePerMile });

  // If no valid coordinates, cannot reliably analyze
  if (riskFlags.includes("NO_COORDS")) {
    return {
      miles,
      price,
      ratePerMile,
      recommendation: "UNKNOWN",
      confidence: "low",
      suggestedMinimum: 0,
      suggestedTarget: 0,
      riskFlags,
      reasoning: "Cannot evaluate: missing coordinates. Address validation required.",
    };
  }

  // Market-based recommendation
  let recommendation: "GOOD" | "NEGOTIATE" | "REJECT" = "REJECT";
  let confidence: "high" | "medium" | "low" = "low";

  if (ratePerMile >= MARKET_THRESHOLDS.PREMIUM) {
    recommendation = "GOOD";
    confidence = "high";
  } else if (ratePerMile >= MARKET_THRESHOLDS.AVERAGE) {
    recommendation = "NEGOTIATE";
    confidence = "medium";
  } else if (ratePerMile >= MARKET_THRESHOLDS.FLOOR) {
    recommendation = "REJECT";
    confidence = "medium";
  } else {
    recommendation = "REJECT";
    confidence = "high";
  }

  // Dynamic pricing calculation
  const multiplier = getDynamicMultiplier(miles);
  const minimum = miles * MARKET_THRESHOLDS.AVERAGE;
  const target = minimum * multiplier;

  const reasoning = generateReasoning(
    { recommendation, ratePerMile, miles },
    load
  );

  return {
    miles,
    price,
    ratePerMile: Number(ratePerMile.toFixed(2)),
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
    SHORT_LOAD: "📦 Short Load",
    LONG_HAUL: "🛣️ Long Haul",
    NO_COORDS: "📍 No Coordinates",
    INCOMPLETE_ADDRESS: "🏠 Incomplete Address",
  };

  return flags.map((flag) => riskLabels[flag] || flag).join(" • ");
}
