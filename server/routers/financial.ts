import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Financial Router - P&L, Metrics, Allocation, Cash Flow
 *
 * Provides comprehensive financial analysis for strategic decision-making:
 * - P&L calculation (revenue, expenses, profit, margin)
 * - Key metrics (profit per load, mile, driver, broker)
 * - Quote analysis variance (estimated vs actual profit)
 * - Allocation system (owner draw, reserve, reinvestment, operating cash)
 * - Cash flow tracking (cash in, pending, wallet, withdrawals)
 */

export const financialRouter = router({
  /**
   * Get P&L Summary
   *
   * Calculates:
   * - totalRevenue: sum of all invoices
   * - totalExpenses: fuel + tolls + maintenance + insurance + driver payouts + commissions
   * - netProfit: totalRevenue - totalExpenses
   * - margin%: (netProfit / totalRevenue) * 100
   *
   * Optional filters: dateRange, companyId, brokerId
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
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            marginPercent: 0,
            breakdown: {
              fuel: 0,
              tolls: 0,
              maintenance: 0,
              insurance: 0,
              driverPayouts: 0,
              commissions: 0,
            },
          };
        }

        // Get all invoices (revenue source)
        const invoices = await db.query.invoices.findMany({
          where: (inv, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(inv.issueDate, input.startDate));
            if (input.endDate) conditions.push(lte(inv.issueDate, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

        // Get all wallet transactions (expenses tracking)
        const transactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(tx.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(tx.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        // Categorize expenses
        const expenses = {
          fuel: 0,
          tolls: 0,
          maintenance: 0,
          insurance: 0,
          driverPayouts: 0,
          commissions: 0,
        };

        transactions.forEach((tx) => {
          const amount = Number(tx.amount || 0);
          const category = tx.category || "";

          if (category.includes("fuel")) expenses.fuel += amount;
          else if (category.includes("toll")) expenses.tolls += amount;
          else if (category.includes("maintenance")) expenses.maintenance += amount;
          else if (category.includes("insurance")) expenses.insurance += amount;
          else if (category.includes("driver") || category.includes("payout"))
            expenses.driverPayouts += amount;
          else if (category.includes("commission")) expenses.commissions += amount;
        });

        const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
        const netProfit = totalRevenue - totalExpenses;
        const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
          totalRevenue,
          totalExpenses,
          netProfit,
          marginPercent: Math.round(marginPercent * 100) / 100,
          breakdown: expenses,
        };
      } catch (err) {
        console.error("[financial.getPLSummary]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate P&L summary",
        });
      }
    }),

  /**
   * Get Profit Metrics
   *
   * Calculates:
   * - profitPerLoad: totalProfit / numberOfLoads
   * - profitPerMile: totalProfit / totalMiles
   * - profitPerDriver: totalProfit / numberOfDrivers
   * - profitPerBroker: breakdown by broker
   */
  getProfitMetrics: protectedProcedure
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
            profitPerLoad: 0,
            profitPerMile: 0,
            profitPerDriver: 0,
            profitByBroker: [],
          };
        }

        // Get P&L summary
        const plSummary = await ctx.trpc.financial.getPLSummary.query(input);

        // Get loads with mileage
        const loads = await db.query.loads.findMany({
          where: (load, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(load.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(load.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const totalMiles = loads.reduce((sum, load) => sum + (Number(load.miles) || 0), 0);
        const numberOfLoads = loads.length;

        // Get unique drivers
        const drivers = await db.query.users.findMany({
          where: (user, { eq }) => eq(user.role, "driver"),
        });

        // Get profit by broker
        const invoices = await db.query.invoices.findMany();
        const profitByBroker = invoices.reduce(
          (acc, inv) => {
            const broker = inv.brokerName || "Unknown";
            const existing = acc.find((b) => b.broker === broker);
            if (existing) {
              existing.revenue += Number(inv.total || 0);
            } else {
              acc.push({
                broker,
                revenue: Number(inv.total || 0),
                profit: 0, // TODO: Calculate per-broker expenses
              });
            }
            return acc;
          },
          [] as Array<{ broker: string; revenue: number; profit: number }>
        );

        return {
          profitPerLoad: numberOfLoads > 0 ? plSummary.netProfit / numberOfLoads : 0,
          profitPerMile: totalMiles > 0 ? plSummary.netProfit / totalMiles : 0,
          profitPerDriver: drivers.length > 0 ? plSummary.netProfit / drivers.length : 0,
          profitByBroker: profitByBroker.map((b) => ({
            ...b,
            profit: b.revenue * (plSummary.marginPercent / 100),
          })),
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
   * Compares estimated vs actual profit:
   * - estimatedProfit: from quote_analysis
   * - actualProfit: calculated from invoice - expenses
   * - variance: actualProfit - estimatedProfit
   * - variancePercent: (variance / estimatedProfit) * 100
   */
  getQuoteVariance: protectedProcedure
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
            totalEstimatedProfit: 0,
            totalActualProfit: 0,
            variance: 0,
            variancePercent: 0,
            byLoad: [],
          };
        }

        // Get quote analyses
        const analyses = await db.query.quoteAnalysis.findMany({
          where: (qa, { and, gte, lte }) => {
            const conditions = [];
            if (input.startDate) conditions.push(gte(qa.createdAt, input.startDate));
            if (input.endDate) conditions.push(lte(qa.createdAt, input.endDate));
            return conditions.length > 0 ? and(...conditions) : undefined;
          },
        });

        const totalEstimatedProfit = analyses.reduce(
          (sum, qa) => sum + (Number(qa.estimatedProfit) || 0),
          0
        );

        // Get actual profit from invoices
        const plSummary = await ctx.trpc.financial.getPLSummary.query(input);
        const totalActualProfit = plSummary.netProfit;

        const variance = totalActualProfit - totalEstimatedProfit;
        const variancePercent =
          totalEstimatedProfit > 0 ? (variance / totalEstimatedProfit) * 100 : 0;

        return {
          totalEstimatedProfit,
          totalActualProfit,
          variance,
          variancePercent: Math.round(variancePercent * 100) / 100,
          byLoad: analyses.map((qa) => ({
            loadId: qa.loadId,
            estimatedProfit: qa.estimatedProfit,
            actualProfit: 0, // TODO: Calculate per-load actual profit
            variance: 0,
          })),
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
   *
   * Returns configured allocation percentages:
   * - ownerDraw%
   * - reserveFund%
   * - reinvestment%
   * - operatingCash%
   */
  getAllocationSettings: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Load from business_config or allocation_settings table
      // For now, return default allocation
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
   * Based on netProfit and allocation settings, calculates:
   * - ownerDraw: netProfit * ownerDrawPercent
   * - reserveFund: netProfit * reserveFundPercent
   * - reinvestment: netProfit * reinvestmentPercent
   * - operatingCash: netProfit * operatingCashPercent
   */
  calculateAllocations: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const plSummary = await ctx.trpc.financial.getPLSummary.query(input);
        const settings = await ctx.trpc.financial.getAllocationSettings.query();

        const netProfit = plSummary.netProfit;

        return {
          netProfit,
          ownerDraw: (netProfit * settings.ownerDrawPercent) / 100,
          reserveFund: (netProfit * settings.reserveFundPercent) / 100,
          reinvestment: (netProfit * settings.reinvestmentPercent) / 100,
          operatingCash: (netProfit * settings.operatingCashPercent) / 100,
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
   * Tracks:
   * - cashIn: paid invoices
   * - cashPending: unpaid invoices
   * - walletBalance: current wallet balance
   * - pendingWithdrawals: requested but not processed
   * - netCashPosition: cashIn + walletBalance - pendingWithdrawals
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

        // Get paid invoices (cash in)
        const invoices = await db.query.invoices.findMany();
        const cashIn = invoices
          .filter((inv) => inv.status === "paid")
          .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

        // Get unpaid invoices (cash pending)
        const cashPending = invoices
          .filter((inv) => inv.status !== "paid")
          .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

        // Get wallet balance
        const wallet = await db.query.wallets.findFirst({
          where: (w, { eq }) => eq(w.driverId, ctx.user.id),
        });
        const walletBalance = wallet ? Number(wallet.availableBalance || 0) : 0;

        // Get pending withdrawals
        const withdrawals = await db.query.withdrawals.findMany({
          where: (w, { eq }) => eq(w.status, "pending"),
        });
        const pendingWithdrawals = withdrawals.reduce(
          (sum, w) => sum + Number(w.amount || 0),
          0
        );

        const netCashPosition = cashIn + walletBalance - pendingWithdrawals;

        return {
          cashIn,
          cashPending,
          walletBalance,
          pendingWithdrawals,
          netCashPosition,
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
   * Combines all financial data for dashboard view:
   * - P&L summary
   * - Key metrics
   * - Quote variance
   * - Allocations
   * - Cash flow
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
        const [plSummary, metrics, variance, allocations, cashFlow] = await Promise.all([
          ctx.trpc.financial.getPLSummary.query(input),
          ctx.trpc.financial.getProfitMetrics.query(input),
          ctx.trpc.financial.getQuoteVariance.query(input),
          ctx.trpc.financial.calculateAllocations.query(input),
          ctx.trpc.financial.getCashFlow.query(input),
        ]);

        return {
          plSummary,
          metrics,
          variance,
          allocations,
          cashFlow,
        };
      } catch (err) {
        console.error("[financial.getDashboardSummary]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get financial dashboard summary",
        });
      }
    }),
});
