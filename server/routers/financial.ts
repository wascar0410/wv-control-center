import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { and, gte, lte } from "drizzle-orm";

/**
 * Financial Router - Production-safe hotfix version
 *
 * Temporary goal:
 * - Avoid schema-mismatched tables in production (invoices / quoteAnalysis)
 * - Avoid ctx.trpc self-calls that are failing in production
 * - Keep finance endpoints alive with safe fallback calculations
 */

type ExpenseBreakdown = {
  fuel: number;
  tolls: number;
  maintenance: number;
  insurance: number;
  driverPayouts: number;
  commissions: number;
};

function emptyBreakdown(): ExpenseBreakdown {
  return {
    fuel: 0,
    tolls: 0,
    maintenance: 0,
    insurance: 0,
    driverPayouts: 0,
    commissions: 0,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function categorizeExpenses(transactions: any[]): ExpenseBreakdown {
  const expenses = emptyBreakdown();

  for (const tx of transactions) {
    const amount = Math.abs(Number(tx.amount || 0));
    const category = String(tx.category || "").toLowerCase();
    const type = String(tx.type || "").toLowerCase();
    const label = `${category} ${type}`;

    if (label.includes("fuel")) expenses.fuel += amount;
    else if (label.includes("toll")) expenses.tolls += amount;
    else if (label.includes("maintenance")) expenses.maintenance += amount;
    else if (label.includes("insurance")) expenses.insurance += amount;
    else if (label.includes("driver") || label.includes("payout"))
      expenses.driverPayouts += amount;
    else if (label.includes("commission")) expenses.commissions += amount;
  }

  return expenses;
}

function getTotalExpenses(expenses: ExpenseBreakdown) {
  return Object.values(expenses).reduce((sum, val) => sum + val, 0);
}

export const financialRouter = router({
  /**
   * Get P&L Summary
   *
   * Production-safe version:
   * - Revenue approximated from walletTransactions of type load_payment
   * - Expenses approximated from walletTransactions categories
   * - Avoids invoices table until schema is aligned
   */
  getPLSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        companyId: z.number().optional(),
        brokerId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            marginPercent: 0,
            breakdown: emptyBreakdown(),
          };
        }

        const transactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(tx.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(tx.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const totalRevenue = transactions
          .filter((tx) => String(tx.type || "").toLowerCase() === "load_payment")
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const expenseTransactions = transactions.filter((tx) => {
          const type = String(tx.type || "").toLowerCase();
          return type !== "load_payment";
        });

        const breakdown = categorizeExpenses(expenseTransactions);
        const totalExpenses = getTotalExpenses(breakdown);
        const netProfit = totalRevenue - totalExpenses;
        const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
          totalRevenue: round2(totalRevenue),
          totalExpenses: round2(totalExpenses),
          netProfit: round2(netProfit),
          marginPercent: round2(marginPercent),
          breakdown: {
            fuel: round2(breakdown.fuel),
            tolls: round2(breakdown.tolls),
            maintenance: round2(breakdown.maintenance),
            insurance: round2(breakdown.insurance),
            driverPayouts: round2(breakdown.driverPayouts),
            commissions: round2(breakdown.commissions),
          },
        };
      } catch (err) {
        console.error("[financial.getPLSummary]", err);
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          marginPercent: 0,
          breakdown: emptyBreakdown(),
        };
      }
    }),

  /**
   * Get Profit Metrics
   *
   * Production-safe version with no ctx.trpc dependency.
   */
  getProfitMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            profitPerLoad: 0,
            profitPerMile: 0,
            profitPerDriver: 0,
            profitByBroker: [],
          };
        }

        const transactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(tx.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(tx.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const loads = await db.query.loads.findMany({
          where: (load, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(load.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(load.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const drivers = await db.query.users.findMany({
          where: (user, { eq }) => eq(user.role, "driver"),
        });

        const totalRevenue = transactions
          .filter((tx) => String(tx.type || "").toLowerCase() === "load_payment")
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const expenseTransactions = transactions.filter((tx) => {
          const type = String(tx.type || "").toLowerCase();
          return type !== "load_payment";
        });

        const totalExpenses = getTotalExpenses(categorizeExpenses(expenseTransactions));
        const netProfit = totalRevenue - totalExpenses;

        const totalMiles = loads.reduce((sum, load) => sum + (Number(load.miles) || 0), 0);
        const numberOfLoads = loads.length;

        return {
          profitPerLoad: numberOfLoads > 0 ? round2(netProfit / numberOfLoads) : 0,
          profitPerMile: totalMiles > 0 ? round2(netProfit / totalMiles) : 0,
          profitPerDriver: drivers.length > 0 ? round2(netProfit / drivers.length) : 0,
          profitByBroker: [],
        };
      } catch (err) {
        console.error("[financial.getProfitMetrics]", err);
        return {
          profitPerLoad: 0,
          profitPerMile: 0,
          profitPerDriver: 0,
          profitByBroker: [],
        };
      }
    }),

  /**
   * Get Quote Analysis Variance
   *
   * Production-safe fallback:
   * - quoteAnalysis table disabled until schema is aligned
   */
  getQuoteVariance: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async () => {
      try {
        return {
          totalEstimatedProfit: 0,
          totalActualProfit: 0,
          variance: 0,
          variancePercent: 0,
          byLoad: [],
        };
      } catch (err) {
        console.error("[financial.getQuoteVariance]", err);
        return {
          totalEstimatedProfit: 0,
          totalActualProfit: 0,
          variance: 0,
          variancePercent: 0,
          byLoad: [],
        };
      }
    }),

  /**
   * Get Allocation Settings
   */
  getAllocationSettings: protectedProcedure.query(async () => {
    try {
      return {
        ownerDrawPercent: 40,
        reserveFundPercent: 20,
        reinvestmentPercent: 20,
        operatingCashPercent: 20,
      };
    } catch (err) {
      console.error("[financial.getAllocationSettings]", err);
      return {
        ownerDrawPercent: 40,
        reserveFundPercent: 20,
        reinvestmentPercent: 20,
        operatingCashPercent: 20,
      };
    }
  }),

  /**
   * Calculate Allocations
   *
   * No ctx.trpc dependency.
   */
  calculateAllocations: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            netProfit: 0,
            ownerDraw: 0,
            reserveFund: 0,
            reinvestment: 0,
            operatingCash: 0,
          };
        }

        const transactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(tx.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(tx.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const totalRevenue = transactions
          .filter((tx) => String(tx.type || "").toLowerCase() === "load_payment")
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const expenseTransactions = transactions.filter((tx) => {
          const type = String(tx.type || "").toLowerCase();
          return type !== "load_payment";
        });

        const totalExpenses = getTotalExpenses(categorizeExpenses(expenseTransactions));
        const netProfit = totalRevenue - totalExpenses;

        const settings = {
          ownerDrawPercent: 40,
          reserveFundPercent: 20,
          reinvestmentPercent: 20,
          operatingCashPercent: 20,
        };

        return {
          netProfit: round2(netProfit),
          ownerDraw: round2((netProfit * settings.ownerDrawPercent) / 100),
          reserveFund: round2((netProfit * settings.reserveFundPercent) / 100),
          reinvestment: round2((netProfit * settings.reinvestmentPercent) / 100),
          operatingCash: round2((netProfit * settings.operatingCashPercent) / 100),
        };
      } catch (err) {
        console.error("[financial.calculateAllocations]", err);
        return {
          netProfit: 0,
          ownerDraw: 0,
          reserveFund: 0,
          reinvestment: 0,
          operatingCash: 0,
        };
      }
    }),

  /**
   * Get Cash Flow Summary
   *
   * Production-safe version:
   * - cashIn approximated from walletTransactions load_payment
   * - cashPending disabled until invoices schema is aligned
   */
  getCashFlow: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            cashIn: 0,
            cashPending: 0,
            walletBalance: 0,
            pendingWithdrawals: 0,
            netCashPosition: 0,
          };
        }

        const transactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(tx.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(tx.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const cashIn = transactions
          .filter((tx) => String(tx.type || "").toLowerCase() === "load_payment")
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const cashPending = 0;

        const wallet = await db.query.wallets.findFirst({
          where: (w, { eq }) => eq(w.driverId, ctx.user.id),
        });
        const walletBalance = wallet ? Number(wallet.availableBalance || 0) : 0;

        const withdrawals = await db.query.withdrawals.findMany({
          where: (w, { eq }) => eq(w.status, "pending"),
        });
        const pendingWithdrawals = withdrawals.reduce(
          (sum, w) => sum + Number(w.amount || 0),
          0
        );

        const netCashPosition = cashIn + walletBalance - pendingWithdrawals;

        return {
          cashIn: round2(cashIn),
          cashPending: round2(cashPending),
          walletBalance: round2(walletBalance),
          pendingWithdrawals: round2(pendingWithdrawals),
          netCashPosition: round2(netCashPosition),
        };
      } catch (err) {
        console.error("[financial.getCashFlow]", err);
        return {
          cashIn: 0,
          cashPending: 0,
          walletBalance: 0,
          pendingWithdrawals: 0,
          netCashPosition: 0,
        };
      }
    }),

  /**
   * Get Financial Dashboard Summary
   *
   * No ctx.trpc self-calls.
   */
  getDashboardSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            plSummary: {
              totalRevenue: 0,
              totalExpenses: 0,
              netProfit: 0,
              marginPercent: 0,
              breakdown: emptyBreakdown(),
            },
            metrics: {
              profitPerLoad: 0,
              profitPerMile: 0,
              profitPerDriver: 0,
              profitByBroker: [],
            },
            variance: {
              totalEstimatedProfit: 0,
              totalActualProfit: 0,
              variance: 0,
              variancePercent: 0,
              byLoad: [],
            },
            allocations: {
              netProfit: 0,
              ownerDraw: 0,
              reserveFund: 0,
              reinvestment: 0,
              operatingCash: 0,
            },
            cashFlow: {
              cashIn: 0,
              cashPending: 0,
              walletBalance: 0,
              pendingWithdrawals: 0,
              netCashPosition: 0,
            },
          };
        }

        const transactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(tx.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(tx.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const loads = await db.query.loads.findMany({
          where: (load, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(load.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(load.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const drivers = await db.query.users.findMany({
          where: (user, { eq }) => eq(user.role, "driver"),
        });

        const wallet = await db.query.wallets.findFirst({
          where: (w, { eq }) => eq(w.driverId, ctx.user.id),
        });

        const withdrawals = await db.query.withdrawals.findMany({
          where: (w, { eq }) => eq(w.status, "pending"),
        });

        const totalRevenue = transactions
          .filter((tx) => String(tx.type || "").toLowerCase() === "load_payment")
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        const expenseTransactions = transactions.filter((tx) => {
          const type = String(tx.type || "").toLowerCase();
          return type !== "load_payment";
        });

        const breakdown = categorizeExpenses(expenseTransactions);
        const totalExpenses = getTotalExpenses(breakdown);
        const netProfit = totalRevenue - totalExpenses;
        const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        const totalMiles = loads.reduce((sum, load) => sum + (Number(load.miles) || 0), 0);
        const numberOfLoads = loads.length;
        const walletBalance = wallet ? Number(wallet.availableBalance || 0) : 0;
        const pendingWithdrawals = withdrawals.reduce(
          (sum, w) => sum + Number(w.amount || 0),
          0
        );
        const cashIn = totalRevenue;
        const cashPending = 0;
        const netCashPosition = cashIn + walletBalance - pendingWithdrawals;

        return {
          plSummary: {
            totalRevenue: round2(totalRevenue),
            totalExpenses: round2(totalExpenses),
            netProfit: round2(netProfit),
            marginPercent: round2(marginPercent),
            breakdown: {
              fuel: round2(breakdown.fuel),
              tolls: round2(breakdown.tolls),
              maintenance: round2(breakdown.maintenance),
              insurance: round2(breakdown.insurance),
              driverPayouts: round2(breakdown.driverPayouts),
              commissions: round2(breakdown.commissions),
            },
          },
          metrics: {
            profitPerLoad: numberOfLoads > 0 ? round2(netProfit / numberOfLoads) : 0,
            profitPerMile: totalMiles > 0 ? round2(netProfit / totalMiles) : 0,
            profitPerDriver: drivers.length > 0 ? round2(netProfit / drivers.length) : 0,
            profitByBroker: [],
          },
          variance: {
            totalEstimatedProfit: 0,
            totalActualProfit: round2(netProfit),
            variance: 0,
            variancePercent: 0,
            byLoad: [],
          },
          allocations: {
            netProfit: round2(netProfit),
            ownerDraw: round2(netProfit * 0.4),
            reserveFund: round2(netProfit * 0.2),
            reinvestment: round2(netProfit * 0.2),
            operatingCash: round2(netProfit * 0.2),
          },
          cashFlow: {
            cashIn: round2(cashIn),
            cashPending: round2(cashPending),
            walletBalance: round2(walletBalance),
            pendingWithdrawals: round2(pendingWithdrawals),
            netCashPosition: round2(netCashPosition),
          },
        };
      } catch (err) {
        console.error("[financial.getDashboardSummary]", err);
        return {
          plSummary: {
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            marginPercent: 0,
            breakdown: emptyBreakdown(),
          },
          metrics: {
            profitPerLoad: 0,
            profitPerMile: 0,
            profitPerDriver: 0,
            profitByBroker: [],
          },
          variance: {
            totalEstimatedProfit: 0,
            totalActualProfit: 0,
            variance: 0,
            variancePercent: 0,
            byLoad: [],
          },
          allocations: {
            netProfit: 0,
            ownerDraw: 0,
            reserveFund: 0,
            reinvestment: 0,
            operatingCash: 0,
          },
          cashFlow: {
            cashIn: 0,
            cashPending: 0,
            walletBalance: 0,
            pendingWithdrawals: 0,
            netCashPosition: 0,
          },
        };
      }
    }),
});
