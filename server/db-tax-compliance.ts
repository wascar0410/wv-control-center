import { getDb } from "./db";
import { transactions, loads, fuelLogs } from "../drizzle/schema";
import { and, eq, gte, lte, sum } from "drizzle-orm";

interface TaxReportData {
  totalIncome: number;
  totalExpenses: number;
  byCategory: Record<string, number>;
  incomeBreakdown: {
    loads: number;
    other: number;
  };
  expenseBreakdown: {
    fuel: number;
    maintenance: number;
    insurance: number;
    tolls: number;
    other: number;
  };
  netProfit: number;
  taxYear: number;
}

/**
 * Generate income report for a tax year
 */
export async function generateIncomeReport(
  taxYear: number
): Promise<TaxReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const startDate = new Date(`${taxYear}-01-01`);
  const endDate = new Date(`${taxYear}-12-31`);

  // Get all income transactions for the year
  const incomeData = await db
    .select({
      totalIncome: sum(transactions.amount),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "income"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );

  const loadIncome = incomeData[0]?.totalIncome ? Number(incomeData[0].totalIncome) : 0;

  return {
    totalIncome: loadIncome,
    totalExpenses: 0,
    byCategory: {
      loads: loadIncome,
    },
    incomeBreakdown: {
      loads: loadIncome,
      other: 0,
    },
    expenseBreakdown: {
      fuel: 0,
      maintenance: 0,
      insurance: 0,
      tolls: 0,
      other: 0,
    },
    netProfit: loadIncome,
    taxYear,
  };
}

/**
 * Generate expense report for a tax year
 */
export async function generateExpenseReport(
  taxYear: number
): Promise<TaxReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const startDate = new Date(`${taxYear}-01-01`);
  const endDate = new Date(`${taxYear}-12-31`);

  // Get all expense transactions for the year
  const expenseData = await db
    .select({
      totalExpenses: sum(transactions.amount),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "expense"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );

  const totalExpenses = expenseData[0]?.totalExpenses ? Number(expenseData[0].totalExpenses) : 0;

  // Get fuel expenses breakdown
  const fuelData = await db
    .select({
      totalFuel: sum(fuelLogs.amount),
    })
    .from(fuelLogs)
    .where(
      and(
        gte(fuelLogs.logDate, startDate),
        lte(fuelLogs.logDate, endDate)
      )
    );

  const fuelExpenses = fuelData[0]?.totalFuel ? Number(fuelData[0].totalFuel) : 0;

  return {
    totalIncome: 0,
    totalExpenses,
    byCategory: {
      fuel: fuelExpenses,
      other: totalExpenses - fuelExpenses,
    },
    incomeBreakdown: {
      loads: 0,
      other: 0,
    },
    expenseBreakdown: {
      fuel: fuelExpenses,
      maintenance: 0,
      insurance: 0,
      tolls: 0,
      other: totalExpenses - fuelExpenses,
    },
    netProfit: 0,
    taxYear,
  };
}

/**
 * Generate transaction detail report for a tax year
 */
export async function generateTransactionReport(
  taxYear: number
): Promise<{
  transactions: Array<{
    transactionDate: Date;
    type: string;
    category: string;
    amount: string;
    description: string | null;
  }>;
  summary: TaxReportData;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const startDate = new Date(`${taxYear}-01-01`);
  const endDate = new Date(`${taxYear}-12-31`);

  const transactionsData = await db
    .select({
      transactionDate: transactions.transactionDate,
      type: transactions.type,
      category: transactions.category,
      amount: transactions.amount,
      description: transactions.description,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .orderBy(transactions.transactionDate);

  // Calculate summary
  const incomeTotal = transactionsData
    .filter((t: any) => t.type === "income")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const expenseTotal = transactionsData
    .filter((t: any) => t.type === "expense")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const summary: TaxReportData = {
    totalIncome: incomeTotal,
    totalExpenses: expenseTotal,
    byCategory: {},
    incomeBreakdown: {
      loads: incomeTotal,
      other: 0,
    },
    expenseBreakdown: {
      fuel: 0,
      maintenance: 0,
      insurance: 0,
      tolls: 0,
      other: expenseTotal,
    },
    netProfit: incomeTotal - expenseTotal,
    taxYear,
  };

  return {
    transactions: transactionsData,
    summary,
  };
}

/**
 * Calculate quarterly tax estimates
 */
export async function calculateQuarterlyEstimates(
  taxYear: number
): Promise<{
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const quarters = {
    q1: { start: `${taxYear}-01-01`, end: `${taxYear}-03-31` },
    q2: { start: `${taxYear}-04-01`, end: `${taxYear}-06-30` },
    q3: { start: `${taxYear}-07-01`, end: `${taxYear}-09-30` },
    q4: { start: `${taxYear}-10-01`, end: `${taxYear}-12-31` },
  };

  const results: Record<string, number> = {};
  let total = 0;

  for (const [quarter, dates] of Object.entries(quarters)) {
    const startDate = new Date(dates.start);
    const endDate = new Date(dates.end);

    const incomeData = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "income"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );

    const income = incomeData[0]?.total ? Number(incomeData[0].total) : 0;

    const expenseData = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );

    const expenses = expenseData[0]?.total ? Number(expenseData[0].total) : 0;
    const profit = income - expenses;

    // Rough estimate: 25% self-employment tax
    const estimate = profit * 0.25;
    results[quarter] = estimate;
    total += estimate;
  }

  return {
    q1: results.q1 || 0,
    q2: results.q2 || 0,
    q3: results.q3 || 0,
    q4: results.q4 || 0,
    total,
  };
}

/**
 * Get tax summary for dashboard
 */
export async function getTaxSummary(taxYear: number) {
  const incomeReport = await generateIncomeReport(taxYear);
  const expenseReport = await generateExpenseReport(taxYear);
  const quarterly = await calculateQuarterlyEstimates(taxYear);

  const netProfit = incomeReport.totalIncome - expenseReport.totalExpenses;
  const effectiveTaxRate = netProfit > 0 ? (quarterly.total / netProfit) * 100 : 0;

  return {
    taxYear,
    totalIncome: incomeReport.totalIncome,
    totalExpenses: expenseReport.totalExpenses,
    netProfit,
    estimatedTaxes: quarterly.total,
    effectiveTaxRate: effectiveTaxRate.toFixed(1),
    quarterly,
  };
}
