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

export interface AnnualComparison {
  year: number;
  months: MonthlyMetrics[];
  annualTotals: {
    totalMiles: number;
    totalProfit: number;
    totalQuotations: number;
    averageMilesPerMonth: number;
    averageProfitPerMonth: number;
    averageProfitPerMile: number;
  };
  quarterlyBreakdown: {
    q1: { miles: number; profit: number; quotations: number };
    q2: { miles: number; profit: number; quotations: number };
    q3: { miles: number; profit: number; quotations: number };
    q4: { miles: number; profit: number; quotations: number };
  };
  bestMonth: {
    month: string;
    miles: number;
    profit: number;
  };
  worstMonth: {
    month: string;
    miles: number;
    profit: number;
  };
  comparison: {
    firstHalfMiles: number;
    secondHalfMiles: number;
    firstHalfProfit: number;
    secondHalfProfit: number;
    milesVariationPercent: number;
    profitVariationPercent: number;
    trend: "improving" | "declining" | "stable";
  };
}

export async function getAnnualComparison(userId: number): Promise<AnnualComparison> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const today = new Date();
  const currentYear = today.getFullYear();
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const months: MonthlyMetrics[] = [];
  let firstHalfMiles = 0;
  let secondHalfMiles = 0;
  let firstHalfProfit = 0;
  let secondHalfProfit = 0;

  // Get data for all 12 months of current year
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthStart = new Date(currentYear, monthIndex, 1);
    const monthEnd = new Date(currentYear, monthIndex + 1, 0);

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

    months.push({
      month: monthNames[monthIndex],
      monthNum: monthIndex,
      miles: Math.round(monthMiles),
      profit: parseFloat(monthProfit.toFixed(2)),
      quotationsCount: monthQuotationsCount,
      averageProfitPerMile: parseFloat(monthAverageProfitPerMile.toFixed(2)),
    });

    // Track first and second half
    if (monthIndex < 6) {
      firstHalfMiles += monthMiles;
      firstHalfProfit += monthProfit;
    } else {
      secondHalfMiles += monthMiles;
      secondHalfProfit += monthProfit;
    }
  }

  // Calculate annual totals
  const totalMiles = months.reduce((sum, m) => sum + m.miles, 0);
  const totalProfit = months.reduce((sum, m) => sum + m.profit, 0);
  const totalQuotations = months.reduce((sum, m) => sum + m.quotationsCount, 0);
  const averageMilesPerMonth = Math.round(totalMiles / 12);
  const averageProfitPerMonth = parseFloat((totalProfit / 12).toFixed(2));
  const averageProfitPerMile = totalMiles > 0 ? parseFloat((totalProfit / totalMiles).toFixed(2)) : 0;

  // Calculate quarterly breakdown
  const q1 = months.slice(0, 3);
  const q2 = months.slice(3, 6);
  const q3 = months.slice(6, 9);
  const q4 = months.slice(9, 12);

  const quarterlyBreakdown = {
    q1: {
      miles: q1.reduce((sum, m) => sum + m.miles, 0),
      profit: parseFloat(q1.reduce((sum, m) => sum + m.profit, 0).toFixed(2)),
      quotations: q1.reduce((sum, m) => sum + m.quotationsCount, 0),
    },
    q2: {
      miles: q2.reduce((sum, m) => sum + m.miles, 0),
      profit: parseFloat(q2.reduce((sum, m) => sum + m.profit, 0).toFixed(2)),
      quotations: q2.reduce((sum, m) => sum + m.quotationsCount, 0),
    },
    q3: {
      miles: q3.reduce((sum, m) => sum + m.miles, 0),
      profit: parseFloat(q3.reduce((sum, m) => sum + m.profit, 0).toFixed(2)),
      quotations: q3.reduce((sum, m) => sum + m.quotationsCount, 0),
    },
    q4: {
      miles: q4.reduce((sum, m) => sum + m.miles, 0),
      profit: parseFloat(q4.reduce((sum, m) => sum + m.profit, 0).toFixed(2)),
      quotations: q4.reduce((sum, m) => sum + m.quotationsCount, 0),
    },
  };

  // Find best and worst months
  const bestMonth = months.reduce((best, current) => 
    current.profit > best.profit ? current : best
  );
  const worstMonth = months.reduce((worst, current) => 
    current.profit < worst.profit ? current : worst
  );

  // Calculate variations
  const milesVariation = secondHalfMiles - firstHalfMiles;
  const milesVariationPercent = firstHalfMiles > 0 ? (milesVariation / firstHalfMiles) * 100 : 0;

  const profitVariation = secondHalfProfit - firstHalfProfit;
  const profitVariationPercent = firstHalfProfit > 0 ? (profitVariation / firstHalfProfit) * 100 : 0;

  // Determine trend
  let trend: "improving" | "declining" | "stable" = "stable";
  if (milesVariationPercent > 5 && profitVariationPercent > 5) {
    trend = "improving";
  } else if (milesVariationPercent < -5 && profitVariationPercent < -5) {
    trend = "declining";
  }

  return {
    year: currentYear,
    months,
    annualTotals: {
      totalMiles,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalQuotations,
      averageMilesPerMonth,
      averageProfitPerMonth,
      averageProfitPerMile,
    },
    quarterlyBreakdown,
    bestMonth: {
      month: bestMonth.month,
      miles: bestMonth.miles,
      profit: bestMonth.profit,
    },
    worstMonth: {
      month: worstMonth.month,
      miles: worstMonth.miles,
      profit: worstMonth.profit,
    },
    comparison: {
      firstHalfMiles: Math.round(firstHalfMiles),
      secondHalfMiles: Math.round(secondHalfMiles),
      firstHalfProfit: parseFloat(firstHalfProfit.toFixed(2)),
      secondHalfProfit: parseFloat(secondHalfProfit.toFixed(2)),
      milesVariationPercent: Math.round(milesVariationPercent * 100) / 100,
      profitVariationPercent: Math.round(profitVariationPercent * 100) / 100,
      trend,
    },
  };
}
