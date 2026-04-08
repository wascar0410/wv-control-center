import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Financial Extended Router - Real Profit Per Load & Financial Alerts
 *
 * Provides production-ready financial calculations:
 * - Real profit per load (revenue - all expenses)
 * - Financial alerts (margin, variance, cash, overdue, blocked payments)
 * - Configurable thresholds from business_config
 */

export const financialExtendedRouter = router({
  /**
   * Get Real Profit Per Load
   *
   * Calculates actual profit for each load:
   * - revenue: invoice total for this load
   * - fuel cost: miles * (fuelPrice / mpg)
   * - tolls: toll expenses
   * - maintenance: miles * maintenancePerMile
   * - driver pay: driver payment for this load
   * - commissions: broker commission
   * - actual profit: revenue - all expenses
   * - actual margin%: (profit / revenue) * 100
   * - profit per mile: profit / miles
   *
   * Compares with Quote Analysis:
   * - estimated profit vs actual profit
   * - variance: actual - estimated
   */
  getProfitPerLoad: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            loadId: input.loadId,
            revenue: 0,
            expenses: {
              fuel: 0,
              tolls: 0,
              maintenance: 0,
              driverPay: 0,
              commissions: 0,
              other: 0,
            },
            totalExpenses: 0,
            actualProfit: 0,
            actualMargin: 0,
            profitPerMile: 0,
            estimatedProfit: 0,
            variance: 0,
            variancePercent: 0,
          };
        }

        // Get load details
        const load = await db.query.loads.findFirst({
          where: (l, { eq }) => eq(l.id, input.loadId),
        });

        if (!load) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Load not found",
          });
        }

        // Get invoice for this load (revenue)
        const invoice = await db.query.invoices.findFirst({
          where: (inv, { eq }) => eq(inv.loadId, input.loadId),
        });
        const revenue = invoice ? Number(invoice.total || 0) : 0;

        // Get business config for cost calculations
        const config = await db.query.businessConfig.findFirst({
          where: (bc, { eq }) => eq(bc.userId, ctx.user.id),
        });

        const miles = Number(load.miles || 0);
        const fuelPrice = Number(config?.fuelPricePerGallon || 3.6);
        const mpg = Number(config?.vanMpg || 18);
        const maintenancePerMile = Number(config?.maintenancePerMile || 0.12);

        // Calculate fuel cost
        const gallonsNeeded = miles / mpg;
        const fuelCost = gallonsNeeded * fuelPrice;

        // Get toll expenses for this load
        const tollTransactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, eq }) => {
            return and(
              eq(tx.loadId, input.loadId),
              tx.category ? tx.category.includes("toll") : false
            );
          },
        });
        const tollsCost = tollTransactions.reduce(
          (sum, tx) => sum + Number(tx.amount || 0),
          0
        );

        // Calculate maintenance cost
        const maintenanceCost = miles * maintenancePerMile;

        // Get driver payment for this load
        const driverPayment = await db.query.driverPayments.findFirst({
          where: (dp, { eq }) => eq(dp.loadId, input.loadId),
        });
        const driverPayCost = driverPayment ? Number(driverPayment.amount || 0) : 0;

        // Get commission (from invoice or estimate)
        const commissionPercent = 0.05; // 5% default commission
        const commissionCost = revenue * commissionPercent;

        // Get other expenses for this load
        const otherTransactions = await db.query.walletTransactions.findMany({
          where: (tx, { and, eq }) => {
            return and(
              eq(tx.loadId, input.loadId),
              tx.category
                ? !tx.category.includes("toll") && !tx.category.includes("fuel")
                : true
            );
          },
        });
        const otherExpenses = otherTransactions.reduce(
          (sum, tx) => sum + Number(tx.amount || 0),
          0
        );

        // Calculate totals
        const expenses = {
          fuel: fuelCost,
          tolls: tollsCost,
          maintenance: maintenanceCost,
          driverPay: driverPayCost,
          commissions: commissionCost,
          other: otherExpenses,
        };

        const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
        const actualProfit = revenue - totalExpenses;
        const actualMargin = revenue > 0 ? (actualProfit / revenue) * 100 : 0;
        const profitPerMile = miles > 0 ? actualProfit / miles : 0;

        // Get quote analysis for comparison
        const quoteAnalysis = await db.query.quoteAnalysis.findFirst({
          where: (qa, { eq }) => eq(qa.loadId, input.loadId),
        });
        const estimatedProfit = quoteAnalysis ? Number(quoteAnalysis.estimatedProfit || 0) : 0;
        const variance = actualProfit - estimatedProfit;
        const variancePercent = estimatedProfit > 0 ? (variance / estimatedProfit) * 100 : 0;

        return {
          loadId: input.loadId,
          revenue,
          expenses,
          totalExpenses,
          actualProfit,
          actualMargin: Math.round(actualMargin * 100) / 100,
          profitPerMile: Math.round(profitPerMile * 100) / 100,
          estimatedProfit,
          variance,
          variancePercent: Math.round(variancePercent * 100) / 100,
        };
      } catch (err) {
        console.error("[financial.getProfitPerLoad]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate profit per load",
        });
      }
    }),

  /**
   * Get Financial Alerts
   *
   * Generates alerts based on configurable thresholds:
   * - Low margin: margin% < marginAlertThreshold
   * - High quote variance: |variance%| > quoteVarianceThreshold
   * - Negative cash position: netCashPosition < 0
   * - Overdue invoices: unpaid > overdueDaysThreshold
   * - Blocked payments: payment blocks > threshold
   */
  getFinancialAlerts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        return {
          alerts: [],
          criticalCount: 0,
          warningCount: 0,
        };
      }

      const alerts = [];

      // Get business config for thresholds
      const config = await db.query.businessConfig.findFirst({
        where: (bc, { eq }) => eq(bc.userId, ctx.user.id),
      });

      const marginThreshold = Number(config?.marginAlertThreshold || 10);
      const varianceThreshold = Number(config?.quoteVarianceThreshold || 20);
      const overdueDaysThreshold = Number(config?.overdueDaysThreshold || 30);

      // 1. Check margin threshold
      const invoices = await db.query.invoices.findMany();
      const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

      const transactions = await db.query.walletTransactions.findMany();
      const totalExpenses = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const margin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

      if (margin < marginThreshold) {
        alerts.push({
          id: "margin_low",
          type: "warning",
          title: "Low Profit Margin",
          message: `Current margin is ${margin.toFixed(2)}%, below threshold of ${marginThreshold}%`,
          severity: margin < 0 ? "critical" : "warning",
          timestamp: new Date(),
        });
      }

      // 2. Check quote variance
      const analyses = await db.query.quoteAnalysis.findMany();
      const highVarianceLoads = analyses.filter((qa) => {
        const variance = qa.actualProfit
          ? ((Number(qa.actualProfit) - Number(qa.estimatedProfit || 0)) /
              Number(qa.estimatedProfit || 1)) *
            100
          : 0;
        return Math.abs(variance) > varianceThreshold;
      });

      if (highVarianceLoads.length > 0) {
        alerts.push({
          id: "variance_high",
          type: "warning",
          title: "High Quote Variance",
          message: `${highVarianceLoads.length} loads have variance > ${varianceThreshold}%`,
          severity: "warning",
          timestamp: new Date(),
        });
      }

      // 3. Check cash position
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

      const cashIn = invoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

      const netCashPosition = cashIn + walletBalance - pendingWithdrawals;

      if (netCashPosition < 0) {
        alerts.push({
          id: "cash_negative",
          type: "critical",
          title: "Negative Cash Position",
          message: `Net cash position is ${netCashPosition.toFixed(2)}, indicating cash shortage`,
          severity: "critical",
          timestamp: new Date(),
        });
      }

      // 4. Check overdue invoices
      const now = new Date();
      const overdueInvoices = invoices.filter((inv) => {
        if (inv.status === "paid") return false;
        const dueDate = new Date(inv.dueDate || now);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOverdue > overdueDaysThreshold;
      });

      if (overdueInvoices.length > 0) {
        alerts.push({
          id: "invoices_overdue",
          type: "warning",
          title: "Overdue Invoices",
          message: `${overdueInvoices.length} invoices are overdue by more than ${overdueDaysThreshold} days`,
          severity: "warning",
          timestamp: new Date(),
        });
      }

      // 5. Check payment blocks
      const paymentBlocks = await db.query.paymentBlocks.findMany({
        where: (pb, { eq }) => eq(pb.status, "active"),
      });

      if (paymentBlocks.length > 0) {
        const blockedAmount = paymentBlocks.reduce(
          (sum, pb) => sum + Number(pb.blockedAmount || 0),
          0
        );
        alerts.push({
          id: "payments_blocked",
          type: "critical",
          title: "Payment Blocks Active",
          message: `${paymentBlocks.length} payment blocks totaling $${blockedAmount.toFixed(2)} are active`,
          severity: "critical",
          timestamp: new Date(),
        });
      }

      const criticalCount = alerts.filter((a) => a.severity === "critical").length;
      const warningCount = alerts.filter((a) => a.severity === "warning").length;

      return {
        alerts,
        criticalCount,
        warningCount,
      };
    } catch (err) {
      console.error("[financial.getFinancialAlerts]", err);
      return {
        alerts: [],
        criticalCount: 0,
        warningCount: 0,
      };
    }
  }),

  /**
   * Update Allocation Settings
   *
   * Validates that percentages sum to 100 before saving
   */
  updateAllocationSettings: protectedProcedure
    .input(
      z.object({
        ownerDrawPercent: z.number().min(0).max(100),
        reserveFundPercent: z.number().min(0).max(100),
        reinvestmentPercent: z.number().min(0).max(100),
        operatingCashPercent: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const total =
          input.ownerDrawPercent +
          input.reserveFundPercent +
          input.reinvestmentPercent +
          input.operatingCashPercent;

        if (Math.abs(total - 100) > 0.01) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Allocation percentages must sum to 100%, got ${total.toFixed(2)}%`,
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Update or create business config
        const existing = await db.query.businessConfig.findFirst({
          where: (bc, { eq }) => eq(bc.userId, ctx.user.id),
        });

        if (existing) {
          await db
            .update(db.schema.businessConfig)
            .set({
              ownerDrawPercent: input.ownerDrawPercent,
              reserveFundPercent: input.reserveFundPercent,
              reinvestmentPercent: input.reinvestmentPercent,
              operatingCashPercent: input.operatingCashPercent,
            })
            .where(eq(db.schema.businessConfig.userId, ctx.user.id));
        } else {
          await db.insert(db.schema.businessConfig).values({
            userId: ctx.user.id,
            ownerDrawPercent: input.ownerDrawPercent,
            reserveFundPercent: input.reserveFundPercent,
            reinvestmentPercent: input.reinvestmentPercent,
            operatingCashPercent: input.operatingCashPercent,
          });
        }

        return {
          success: true,
          message: "Allocation settings updated",
        };
      } catch (err) {
        console.error("[financial.updateAllocationSettings]", err);
        throw err;
      }
    }),

  /**
   * Update Alert Thresholds
   */
  updateAlertThresholds: protectedProcedure
    .input(
      z.object({
        marginAlertThreshold: z.number().min(0).max(100),
        quoteVarianceThreshold: z.number().min(0).max(100),
        overdueDaysThreshold: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const existing = await db.query.businessConfig.findFirst({
          where: (bc, { eq }) => eq(bc.userId, ctx.user.id),
        });

        if (existing) {
          await db
            .update(db.schema.businessConfig)
            .set({
              marginAlertThreshold: input.marginAlertThreshold,
              quoteVarianceThreshold: input.quoteVarianceThreshold,
              overdueDaysThreshold: input.overdueDaysThreshold,
            })
            .where(eq(db.schema.businessConfig.userId, ctx.user.id));
        }

        return {
          success: true,
          message: "Alert thresholds updated",
        };
      } catch (err) {
        console.error("[financial.updateAlertThresholds]", err);
        throw err;
      }
    }),
});
