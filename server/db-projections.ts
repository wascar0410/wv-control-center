import { getDb } from "./db";
import { loadQuotations } from "../drizzle/schema";
import { eq, gte, lt, and } from "drizzle-orm";

export async function getMonthlyProjections(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const daysPassed = today.getDate();
  const daysRemaining = daysInMonth - daysPassed;

  // Get accepted quotations this month (completed loads)
  const completedQuotations = await db!
    .select({
      id: loadQuotations.id,
      totalMiles: loadQuotations.totalMiles,
      totalPrice: loadQuotations.totalPrice,
      estimatedOperatingCost: loadQuotations.estimatedOperatingCost,
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

  // Get quoted quotations (in progress/pending)
  const quotedQuotations = await db!
    .select({
      id: loadQuotations.id,
      totalMiles: loadQuotations.totalMiles,
      totalPrice: loadQuotations.totalPrice,
      estimatedOperatingCost: loadQuotations.estimatedOperatingCost,
      estimatedProfit: loadQuotations.estimatedProfit,
      status: loadQuotations.status,
    })
    .from(loadQuotations)
    .where(
      and(
        eq(loadQuotations.userId, userId),
        eq(loadQuotations.status, "quoted")
      )
    );

  // Calculate completed metrics
  const completedMiles = completedQuotations.reduce(
    (sum, q) => sum + parseFloat(q.totalMiles?.toString() || "0"),
    0
  );
  const completedIncome = completedQuotations.reduce(
    (sum, q) => sum + parseFloat(q.totalPrice?.toString() || "0"),
    0
  );
  const completedCost = completedQuotations.reduce(
    (sum, q) => sum + parseFloat(q.estimatedOperatingCost?.toString() || "0"),
    0
  );
  const completedProfit = completedQuotations.reduce(
    (sum, q) => sum + parseFloat(q.estimatedProfit?.toString() || "0"),
    0
  );

  // Calculate quoted metrics
  const quotedMiles = quotedQuotations.reduce(
    (sum, q) => sum + parseFloat(q.totalMiles?.toString() || "0"),
    0
  );
  const quotedIncome = quotedQuotations.reduce(
    (sum, q) => sum + parseFloat(q.totalPrice?.toString() || "0"),
    0
  );
  const quotedProfit = quotedQuotations.reduce(
    (sum, q) => sum + parseFloat(q.estimatedProfit?.toString() || "0"),
    0
  );

  // Calculate projections
  const totalMilesActual = completedMiles + quotedMiles;
  const dailyAverageMiles = daysPassed > 0 ? completedMiles / daysPassed : 0;
  const projectedTotalMiles = completedMiles + (dailyAverageMiles * daysRemaining);
  const milesPercentage = (projectedTotalMiles / 4000) * 100;

  const totalIncomeActual = completedIncome + quotedIncome;
  const dailyAverageIncome = daysPassed > 0 ? completedIncome / daysPassed : 0;
  const projectedTotalIncome = completedIncome + (dailyAverageIncome * daysRemaining);

  const totalProfitActual = completedProfit + quotedProfit;
  const dailyAverageProfit = daysPassed > 0 ? completedProfit / daysPassed : 0;
  const projectedTotalProfit = completedProfit + (dailyAverageProfit * daysRemaining);

  return {
    // Completed
    completedMiles: Math.round(completedMiles),
    completedIncome: parseFloat(completedIncome.toFixed(2)),
    completedCost: parseFloat(completedCost.toFixed(2)),
    completedProfit: parseFloat(completedProfit.toFixed(2)),
    completedQuotationsCount: completedQuotations.length,

    // Quoted/In Progress
    quotedMiles: Math.round(quotedMiles),
    quotedIncome: parseFloat(quotedIncome.toFixed(2)),
    quotedProfit: parseFloat(quotedProfit.toFixed(2)),
    quotedQuotationsCount: quotedQuotations.length,

    // Actual Total
    totalMilesActual: Math.round(totalMilesActual),
    totalIncomeActual: parseFloat(totalIncomeActual.toFixed(2)),
    totalProfitActual: parseFloat(totalProfitActual.toFixed(2)),

    // Projections
    projectedTotalMiles: Math.round(projectedTotalMiles),
    projectedTotalIncome: parseFloat(projectedTotalIncome.toFixed(2)),
    projectedTotalProfit: parseFloat(projectedTotalProfit.toFixed(2)),
    milesPercentage: Math.round(milesPercentage),
    willReachGoal: projectedTotalMiles >= 4000,

    // Metrics
    dailyAverageMiles: Math.round(dailyAverageMiles),
    dailyAverageIncome: parseFloat(dailyAverageIncome.toFixed(2)),
    dailyAverageProfit: parseFloat(dailyAverageProfit.toFixed(2)),
    daysPassed,
    daysRemaining,
    daysInMonth,
  };
}
