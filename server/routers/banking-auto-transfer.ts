/**
 * Banking Auto-Transfer Router
 * Handles auto-transfer scheduling and execution
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { cashFlowRules, autoTransferLogs, bankAccounts, reserveTransferSuggestions } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Helper para company-level scope
const getScopedUserId = (ctx: any) => {
  const isOwnerOrAdmin = ctx.user.role === "owner" || ctx.user.role === "admin";
  return isOwnerOrAdmin ? 1 : getScopedUserId(ctx);
};


export const bankingAutoTransferRouter = router({
  /**
   * Get auto-transfer schedule configuration
   */
  getAutoTransferSchedule: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rule = await db
        .select()
        .from(cashFlowRules)
        .where(eq(cashFlowRules.ownerId, getScopedUserId(ctx)))
        .limit(1);

      if (!rule || rule.length === 0) {
        return {
          enabled: false,
          dayOfMonth: 1,
          time: "09:00",
          lastExecutedAt: null,
        };
      }

      const r = rule[0];
      return {
        enabled: r.autoTransferEnabled || false,
        dayOfMonth: r.autoTransferDay || 1,
        time: r.autoTransferTime || "09:00",
        lastExecutedAt: r.lastAutoTransferAt,
      };
    } catch (err) {
      console.error("[Banking] Error getting auto-transfer schedule:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get auto-transfer schedule",
      });
    }
  }),

  /**
   * Set auto-transfer schedule configuration
   */
  setAutoTransferSchedule: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        dayOfMonth: z.number().min(1).max(31),
        time: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get or create rule
        const existing = await db
          .select()
          .from(cashFlowRules)
          .where(eq(cashFlowRules.ownerId, getScopedUserId(ctx)))
          .limit(1);

        if (existing && existing.length > 0) {
          // Update existing
          await db
            .update(cashFlowRules)
            .set({
              autoTransferEnabled: input.enabled,
              autoTransferDay: input.dayOfMonth,
              autoTransferTime: input.time,
            })
            .where(eq(cashFlowRules.ownerId, getScopedUserId(ctx)));
        } else {
          // Create new
          await db.insert(cashFlowRules).values({
            ownerId: getScopedUserId(ctx),
            autoTransferEnabled: input.enabled,
            autoTransferDay: input.dayOfMonth,
            autoTransferTime: input.time,
            reservePercent: 20,
          });
        }

        console.log("[Banking] Auto-transfer schedule updated:", {
          userId: getScopedUserId(ctx),
          enabled: input.enabled,
          dayOfMonth: input.dayOfMonth,
          time: input.time,
        });

        return {
          success: true,
          enabled: input.enabled,
          dayOfMonth: input.dayOfMonth,
          time: input.time,
        };
      } catch (err) {
        console.error("[Banking] Error setting auto-transfer schedule:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set auto-transfer schedule",
        });
      }
    }),

  /**
   * Get auto-transfer execution logs
   */
  getAutoTransferLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const logs = await db
          .select()
          .from(autoTransferLogs)
          .where(eq(autoTransferLogs.ownerId, getScopedUserId(ctx)))
          .orderBy(desc(autoTransferLogs.executedAt))
          .limit(input.limit);

        return logs.map((log) => ({
          id: log.id,
          status: log.status,
          amount: log.amount ? parseFloat(log.amount.toString()) : null,
          reason: log.reason,
          error: log.error,
          executedAt: log.executedAt,
        }));
      } catch (err) {
        console.error("[Banking] Error getting auto-transfer logs:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get auto-transfer logs",
        });
      }
    }),

  /**
   * Execute auto-transfer manually
   */
  executeAutoTransfer: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get cash flow rule
      const rule = await db
        .select()
        .from(cashFlowRules)
        .where(eq(cashFlowRules.ownerId, getScopedUserId(ctx)))
        .limit(1);

      if (!rule || rule.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No cash flow rule configured",
        });
      }

      const r = rule[0];

      if (!r.operatingAccountId || !r.reserveAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Operating and reserve accounts must be configured",
        });
      }

      // Check for pending reserves
      const pendingReserves = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(
          and(
            eq(reserveTransferSuggestions.ownerId, getScopedUserId(ctx)),
            eq(reserveTransferSuggestions.fromAccountId, r.operatingAccountId)
          )
        );

      const reservedAmount = pendingReserves
        .filter((s) => s.status === "suggested" || s.status === "approved")
        .reduce((sum, s) => sum + parseFloat(s.suggestedAmount.toString()), 0);

      if (reservedAmount > 0) {
        // Log as skipped
        await db.insert(autoTransferLogs).values({
          ownerId: getScopedUserId(ctx),
          cashFlowRuleId: r.id,
          status: "skipped",
          reason: `Pending reserves: $${reservedAmount.toFixed(2)}`,
          fromAccountId: r.operatingAccountId,
          toAccountId: r.reserveAccountId,
        });

        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot execute transfer: $${reservedAmount.toFixed(2)} in pending reserves`,
        });
      }

      // Get operating account balance
      const operatingAccount = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, r.operatingAccountId))
        .limit(1);

      if (!operatingAccount || operatingAccount.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operating account not found",
        });
      }

      const balance = parseFloat(operatingAccount[0].balance?.toString() || "0");
      const minReserve = parseFloat(r.minReserveAmount.toString());

      if (balance <= minReserve) {
        // Log as skipped
        await db.insert(autoTransferLogs).values({
          ownerId: getScopedUserId(ctx),
          cashFlowRuleId: r.id,
          status: "skipped",
          reason: `Insufficient balance: $${balance.toFixed(2)} <= min $${minReserve.toFixed(2)}`,
          fromAccountId: r.operatingAccountId,
          toAccountId: r.reserveAccountId,
        });

        throw new TRPCError({
          code: "CONFLICT",
          message: `Insufficient balance for transfer`,
        });
      }

      // Calculate transfer amount
      const transferAmount = Math.min(
        balance * (parseFloat(r.reservePercent.toString()) / 100),
        parseFloat(r.maxReserveAmount.toString())
      );

      // Log successful execution
      await db.insert(autoTransferLogs).values({
        ownerId: getScopedUserId(ctx),
        cashFlowRuleId: r.id,
        status: "success",
        amount: transferAmount,
        reason: "Manual execution",
        fromAccountId: r.operatingAccountId,
        toAccountId: r.reserveAccountId,
      });

      // Update last execution time
      await db
        .update(cashFlowRules)
        .set({ lastAutoTransferAt: new Date() })
        .where(eq(cashFlowRules.id, r.id));

      console.log("[Banking] Auto-transfer executed:", {
        userId: getScopedUserId(ctx),
        amount: transferAmount,
        fromAccountId: r.operatingAccountId,
        toAccountId: r.reserveAccountId,
      });

      return {
        success: true,
        amount: transferAmount,
        message: `Transfer of $${transferAmount.toFixed(2)} executed successfully`,
      };
    } catch (err) {
      console.error("[Banking] Error executing auto-transfer:", err);
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to execute auto-transfer",
      });
    }
  }),
});
