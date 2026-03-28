import { getDb } from "./db";
import { loadQuotations } from "../drizzle/schema";
import { eq, gte, lt, and } from "drizzle-orm";

export interface HistoricalComparison {
  currentMonth: {
    miles: number;
    profit: number;
    quotationsCount: number;
    averageProfitPerMile: number;
  };
  previousMonth: {
    miles: number;
    profit: number;
    quotationsCount: number;
    averageProfitPerMile: number;
  };
  comparison: {
    milesVariation: number;
    milesVariationPercent: number;
    profitVariation: number;
    profitVariationPercent: number;
    quotationsVariation: number;
    quotationsVariationPercent: number;
    profitPerMileVariation: number;
    profitPerMileVariationPercent: number;
    trend: "improving" | "declining" | "stable";
  };
}

export async function getHistoricalComparison(userId: number): Promise<HistoricalComparison> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const today = new Date();
  
  // Current month boundaries
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Previous month boundaries
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  // Get current month accepted quotations
  const currentMonthQuotations = await db!
    .select({
      id: loadQuotations.id,
      totalMiles: loadQuotations.totalMiles,
      totalPrice: loadQuotations.totalPrice,
      estimatedProfit: loadQuotations.estimatedProfit,
      status: loadQuotations.status,
      createdAt: loadQuotations.createdAt,
    })
    .from(loadQuotations)
    .where(
      and(
        eq(loadQuotations.userId, userId),
        eq(loadQuotations.status, "accepted"),
        gte(loadQuotations.createdAt, currentMonthStart),
        lt(loadQuotations.createdAt, new Date(currentMonthEnd.getTime() + 24 * 60 * 60 * 1000))
      )
    );

  // Get previous month accepted quotations
  const previousMonthQuotations = await db!
    .select({
      id: loadQuotations.id,
      totalMiles: loadQuotations.totalMiles,
      totalPrice: loadQuotations.totalPrice,
      estimatedProfit: loadQuotations.estimatedProfit,
      status: loadQuotations.status,
      createdAt: loadQuotations.createdAt,
    })
    .from(loadQuotations)
    .where(
      and(
        eq(loadQuotations.userId, userId),
        eq(loadQuotations.status, "accepted"),
        gte(loadQuotations.createdAt, previousMonthStart),
        lt(loadQuotations.createdAt, new Date(previousMonthEnd.getTime() + 24 * 60 * 60 * 1000))
      )
    );

  // Calculate current month metrics
  const currentMiles = currentMonthQuotations.reduce(
    (sum, q) => sum + parseFloat(q.totalMiles?.toString() || "0"),
    0
  );
  const currentProfit = currentMonthQuotations.reduce(
    (sum, q) => sum + parseFloat(q.estimatedProfit?.toString() || "0"),
    0
  );
  const currentQuotationsCount = currentMonthQuotations.length;
  const currentAverageProfitPerMile = currentMiles > 0 ? currentProfit / currentMiles : 0;

  // Calculate previous month metrics
  const previousMiles = previousMonthQuotations.reduce(
    (sum, q) => sum + parseFloat(q.totalMiles?.toString() || "0"),
    0
  );
  const previousProfit = previousMonthQuotations.reduce(
    (sum, q) => sum + parseFloat(q.estimatedProfit?.toString() || "0"),
    0
  );
  const previousQuotationsCount = previousMonthQuotations.length;
  const previousAverageProfitPerMile = previousMiles > 0 ? previousProfit / previousMiles : 0;

  // Calculate variations
  const milesVariation = currentMiles - previousMiles;
  const milesVariationPercent = previousMiles > 0 ? (milesVariation / previousMiles) * 100 : 0;
  
  const profitVariation = currentProfit - previousProfit;
  const profitVariationPercent = previousProfit > 0 ? (profitVariation / previousProfit) * 100 : 0;
  
  const quotationsVariation = currentQuotationsCount - previousQuotationsCount;
  const quotationsVariationPercent = previousQuotationsCount > 0 
    ? (quotationsVariation / previousQuotationsCount) * 100 
    : 0;
  
  const profitPerMileVariation = currentAverageProfitPerMile - previousAverageProfitPerMile;
  const profitPerMileVariationPercent = previousAverageProfitPerMile > 0
    ? (profitPerMileVariation / previousAverageProfitPerMile) * 100
    : 0;

  // Determine trend
  let trend: "improving" | "declining" | "stable" = "stable";
  if (milesVariationPercent > 5 && profitVariationPercent > 5) {
    trend = "improving";
  } else if (milesVariationPercent < -5 && profitVariationPercent < -5) {
    trend = "declining";
  }

  return {
    currentMonth: {
      miles: Math.round(currentMiles),
      profit: parseFloat(currentProfit.toFixed(2)),
      quotationsCount: currentQuotationsCount,
      averageProfitPerMile: parseFloat(currentAverageProfitPerMile.toFixed(2)),
    },
    previousMonth: {
      miles: Math.round(previousMiles),
      profit: parseFloat(previousProfit.toFixed(2)),
      quotationsCount: previousQuotationsCount,
      averageProfitPerMile: parseFloat(previousAverageProfitPerMile.toFixed(2)),
    },
    comparison: {
      milesVariation: Math.round(milesVariation),
      milesVariationPercent: Math.round(milesVariationPercent * 100) / 100,
      profitVariation: parseFloat(profitVariation.toFixed(2)),
      profitVariationPercent: Math.round(profitVariationPercent * 100) / 100,
      quotationsVariation,
      quotationsVariationPercent: Math.round(quotationsVariationPercent * 100) / 100,
      profitPerMileVariation: parseFloat(profitPerMileVariation.toFixed(2)),
      profitPerMileVariationPercent: Math.round(profitPerMileVariationPercent * 100) / 100,
      trend,
    },
  };
}
