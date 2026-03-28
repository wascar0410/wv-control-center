import { getDb } from "./db";
import { loadQuotations } from "../drizzle/schema";
import { eq, gte, lt, and } from "drizzle-orm";

export interface MonthlyMetrics {
  month: string;
  monthNum: number;
  miles: number;
  profit: number;
  quotationsCount: number;
  averageProfitPerMile: number;
}

export interface QuarterlyComparison {
  months: MonthlyMetrics[];
  quarterlyTotals: {
    totalMiles: number;
    totalProfit: number;
    totalQuotations: number;
    averageMilesPerMonth: number;
    averageProfitPerMonth: number;
    averageProfitPerMile: number;
  };
  comparison: {
    milesVariation: number;
    milesVariationPercent: number;
    profitVariation: number;
    profitVariationPercent: number;
    trend: "improving" | "declining" | "stable";
  };
}

export async function getQuarterlyComparison(userId: number): Promise<QuarterlyComparison> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get last 3 months (current month + previous 2 months)
  const months: MonthlyMetrics[] = [];
  let firstMonthMiles = 0;
  let lastMonthMiles = 0;
  let firstMonthProfit = 0;
  let lastMonthProfit = 0;

  for (let i = 2; i >= 0; i--) {
    const monthDate = new Date(currentYear, currentMonth - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const monthQuotations = await db!
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
          gte(loadQuotations.createdAt, monthStart),
          lt(loadQuotations.createdAt, new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000))
        )
      );

    const monthMiles = monthQuotations.reduce(
      (sum, q) => sum + parseFloat(q.totalMiles?.toString() || "0"),
      0
    );
    const monthProfit = monthQuotations.reduce(
      (sum, q) => sum + parseFloat(q.estimatedProfit?.toString() || "0"),
      0
    );
    const monthQuotationsCount = monthQuotations.length;
    const monthAverageProfitPerMile = monthMiles > 0 ? monthProfit / monthMiles : 0;

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthName = monthNames[monthDate.getMonth()];

    months.push({
      month: monthName,
      monthNum: monthDate.getMonth(),
      miles: Math.round(monthMiles),
      profit: parseFloat(monthProfit.toFixed(2)),
      quotationsCount: monthQuotationsCount,
      averageProfitPerMile: parseFloat(monthAverageProfitPerMile.toFixed(2)),
    });

    // Track first and last month for comparison
    if (i === 2) {
      firstMonthMiles = monthMiles;
      firstMonthProfit = monthProfit;
    }
    if (i === 0) {
      lastMonthMiles = monthMiles;
      lastMonthProfit = monthProfit;
    }
  }

  // Calculate quarterly totals
  const totalMiles = months.reduce((sum, m) => sum + m.miles, 0);
  const totalProfit = months.reduce((sum, m) => sum + m.profit, 0);
  const totalQuotations = months.reduce((sum, m) => sum + m.quotationsCount, 0);
  const averageMilesPerMonth = Math.round(totalMiles / 3);
  const averageProfitPerMonth = parseFloat((totalProfit / 3).toFixed(2));
  const averageProfitPerMile = totalMiles > 0 ? parseFloat((totalProfit / totalMiles).toFixed(2)) : 0;

  // Calculate variations (first month vs last month)
  const milesVariation = lastMonthMiles - firstMonthMiles;
  const milesVariationPercent = firstMonthMiles > 0 ? (milesVariation / firstMonthMiles) * 100 : 0;

  const profitVariation = lastMonthProfit - firstMonthProfit;
  const profitVariationPercent = firstMonthProfit > 0 ? (profitVariation / firstMonthProfit) * 100 : 0;

  // Determine trend
  let trend: "improving" | "declining" | "stable" = "stable";
  if (milesVariationPercent > 5 && profitVariationPercent > 5) {
    trend = "improving";
  } else if (milesVariationPercent < -5 && profitVariationPercent < -5) {
    trend = "declining";
  }

  return {
    months,
    quarterlyTotals: {
      totalMiles,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalQuotations,
      averageMilesPerMonth,
      averageProfitPerMonth,
      averageProfitPerMile,
    },
    comparison: {
      milesVariation: Math.round(milesVariation),
      milesVariationPercent: Math.round(milesVariationPercent * 100) / 100,
      profitVariation: parseFloat(profitVariation.toFixed(2)),
      profitVariationPercent: Math.round(profitVariationPercent * 100) / 100,
      trend,
    },
  };
}
