import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { bankAccounts, reserveTransferSuggestions, wallets } from "../../drizzle/schema";
import {
  getDb,
  getOrCreateWallet,
  getWalletByDriverId,
  updateWalletBalance,
  addWalletTransaction,
  getWalletTransactions,
  requestWithdrawal,
  getWithdrawals,
  failWithdrawal,
  getWalletSummary as getWalletSummaryFromDb,
  getPartnerSummary as getPartnerSummaryFromDb,
  getFinancialHistory as getFinancialHistoryFromDb,
  backfillReservedBalance,
  normalizeLegacyPendingWithdrawals,
} from "../db";

/**
 * Helpers
 */
function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function safeWallet(wallet: any) {
  if (!wallet) return null;

  return {
    ...wallet,
    totalEarnings: toNumber(wallet.totalEarnings),
    availableBalance: toNumber(wallet.availableBalance),
    reservedBalance: toNumber(wallet.reservedBalance),
    pendingBalance: toNumber(wallet.pendingBalance),
    blockedBalance: toNumber(wallet.blockedBalance),
    minimumWithdrawalAmount: toNumber(wallet.minimumWithdrawalAmount),
    withdrawalFeePercent: toNumber(wallet.withdrawalFeePercent),
  };
}

function ensureAdminOrOwner(role?: string) {
  if (role !== "admin" && role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Unauthorized",
    });
  }
}

export const walletRouter = router({
  /**
   * Get wallet for current user
   */
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    try {
      let wallet = await getWalletByDriverId(ctx.user.id);

      if (!wallet) {
        wallet = await getOrCreateWallet(ctx.user.id);
      }

      return safeWallet(wallet);
    } catch (err) {
      console.error("[wallet.getWallet]", err);
      return null;
    }
  }),

  /**
   * Get wallet transactions
   */
  getTransactions: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const transactions = await getWalletTransactions(ctx.user.id, input.limit, input.offset);
        return transactions || [];
      } catch (err) {
        console.error("[wallet.getTransactions]", err);
        return [];
      }
    }),

  /**
   * Request withdrawal
   */
  requestWithdrawal: protectedProcedure
    .input(z.object({ amount: z.number(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await requestWithdrawal(ctx.user.id, input.amount, input.description);
        return result;
      } catch (err) {
        console.error("[wallet.requestWithdrawal]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to request withdrawal",
        });
      }
    }),

  /**
   * Get withdrawals
   */
  getWithdrawals: protectedProcedure.query(async ({ ctx }) => {
    try {
      const withdrawals = await getWithdrawals(ctx.user.id);
      return withdrawals || [];
    } catch (err) {
      console.error("[wallet.getWithdrawals]", err);
      return [];
    }
  }),

  /**
   * Get reserve suggestions
   */
  getReserveSuggestions: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return [];

        let query = db
          .select()
          .from(reserveTransferSuggestions)
          .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

        if (input.status) {
          query = db
            .select()
            .from(reserveTransferSuggestions)
            .where(
              sql`${reserveTransferSuggestions.ownerId} = ${ctx.user.id} AND ${reserveTransferSuggestions.status} = ${input.status}`
            );
        }

        const suggestions = await query;
        return suggestions || [];
      } catch (err) {
        console.error("[wallet.getReserveSuggestions]", err);
        return [];
      }
    }),

  /**
   * Get reserve summary
   */
  getReserveSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const suggestions = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

      const suggested = suggestions
        .filter((s) => s.status === "suggested" || s.status === "approved")
        .reduce((sum, s) => sum + Number(s.suggestedAmount || 0), 0);

      const completed = suggestions
        .filter((s) => s.status === "completed")
        .reduce((sum, s) => sum + Number(s.suggestedAmount || 0), 0);

      return {
        totalSuggested: suggested,
        totalCompletedAmount: completed,
      };
    } catch (err) {
      console.error("[wallet.getReserveSummary]", err);
      return { totalSuggested: 0, totalCompletedAmount: 0 };
    }
  }),

  /**
   * Dismiss reserve suggestion - Simple and safe
   */
  dismissReserveSuggestion: protectedProcedure
    .input(z.object({ suggestionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { suggestionId } = input;

      // 1. Buscar sugerencia
      const suggestion = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(
          and(
            eq(reserveTransferSuggestions.id, suggestionId),
            eq(reserveTransferSuggestions.ownerId, ctx.user.id)
          )
        )
        .limit(1);

      if (!suggestion.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Suggestion not found",
        });
      }

      const s = suggestion[0];

      // 2. Validar estado
      if (s.status !== "suggested") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only suggested can be dismissed",
        });
      }

      // 3. Update (SIN tocar wallet, SIN updatedAt por ahora)
      await db
        .update(reserveTransferSuggestions)
        .set({
          status: "dismissed",
        })
        .where(eq(reserveTransferSuggestions.id, suggestionId));

      console.log("[Reserve] DISMISSED", {
        suggestionId,
        userId: ctx.user.id,
        newStatus: "dismissed",
      });

      return { success: true };
    }),

  /**
   * Complete reserve suggestion - Mark as done
   */
  completeReserveSuggestion: protectedProcedure
    .input(z.object({ suggestionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const suggestion = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(eq(reserveTransferSuggestions.id, input.suggestionId))
        .limit(1);

      if (!suggestion.length) {
        throw new Error("Suggestion not found");
      }

      const s = suggestion[0];

      if (s.status === "completed") {
        return { success: true };
      }

      // 1. obtener wallet actual
      let walletRaw = await getWalletByDriverId(ctx.user.id);
      if (!walletRaw) {
        walletRaw = await getOrCreateWallet(ctx.user.id);
      }

      const wallet = safeWallet(walletRaw);
      if (!wallet || !wallet.id) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Wallet not found",
        });
      }

      // 2. calcular nuevo balance - mover de available a reserved
      const amount = Number(s.suggestedAmount || 0);
      const newAvailableBalance = Math.max(0, Number(wallet.availableBalance || 0) - amount);
      const newReservedBalance = Number(wallet.reservedBalance || 0) + amount;

      // 3. actualizar wallet - mover dinero
      await updateWalletBalance(wallet.id, {
        availableBalance: String(newAvailableBalance),
        reservedBalance: String(newReservedBalance),
      });

      // 4. crear evento contable en wallet_transactions
      await addWalletTransaction(wallet.id, ctx.user.id, {
        type: "reserve_transfer",
        amount: String(amount),
        reserveSuggestionId: input.suggestionId,
        externalTransactionId: s.externalTransactionId || undefined,
        description: `Auto reserve completed (Suggestion #${input.suggestionId})`,
        status: "completed",
      });

      // 5. marcar suggestion como completed
      await db
        .update(reserveTransferSuggestions)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reserveTransferSuggestions.id, input.suggestionId));

      // 6. log claro con trazabilidad contable
      console.log("[Accounting] Reserve transfer completed", {
        suggestionId: input.suggestionId,
        externalTransactionId: s.externalTransactionId,
        amount,
        previousAvailableBalance: wallet.availableBalance,
        newAvailableBalance,
        previousReservedBalance: wallet.reservedBalance,
        newReservedBalance,
        userId: ctx.user.id,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    }),

  /**
   * Get withdrawable balance - available minus reserved pending
   */
  getWithdrawableBalance: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let walletRaw = await getWalletByDriverId(ctx.user.id);

      if (!walletRaw) {
        walletRaw = await getOrCreateWallet(ctx.user.id);
      }

      if (!walletRaw) {
        return {
          availableBalance: 0,
          reservedPending: 0,
          withdrawableBalance: 0,
        };
      }

      const wallet = safeWallet(walletRaw);

      const suggestions = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

      const reservedPending = suggestions
        .filter((s) => s.status === "suggested" || s.status === "approved")
        .reduce((sum, s) => sum + Number(s.suggestedAmount || 0), 0);

      const withdrawable = Math.max(0, Number(wallet.availableBalance || 0) - reservedPending);

      return {
        availableBalance: wallet.availableBalance,
        reservedPending,
        withdrawableBalance: withdrawable,
      };
    } catch (err) {
      console.error("[wallet.getWithdrawableBalance]", err);
      return {
        availableBalance: 0,
        reservedPending: 0,
        withdrawableBalance: 0,
      };
    }
  }),

  /**
   * Get financial history - combined events
   */
  getFinancialHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return [];

        const limit = input.limit || 50;
        const offset = input.offset || 0;

        const transactions = await getWalletTransactions(ctx.user.id, limit + 100, 0);
        const suggestions = await db
          .select()
          .from(reserveTransferSuggestions)
          .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

        const events: any[] = [];

        if (transactions) {
          transactions.forEach((tx: any) => {
            events.push({
              id: `tx-${tx.id}`,
              type: tx.type === "withdrawal" ? "Withdrawal" : "Deposit",
              amount: tx.amount,
              description: tx.description,
              date: tx.createdAt,
              status: tx.status,
            });
          });
        }

        suggestions.forEach((s: any) => {
          const statusLabel =
            s.status === "suggested"
              ? "Reserve Suggested"
              : s.status === "completed"
                ? "Reserve Completed"
                : s.status === "dismissed"
                  ? "Reserve Dismissed"
                  : "Reserve Approved";

          events.push({
            id: `reserve-${s.id}`,
            type: statusLabel,
            amount: s.suggestedAmount,
            description: s.reason,
            date: s.createdAt,
            status: s.status,
          });
        });

        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return events.slice(offset, offset + limit);
      } catch (err) {
        console.error("[wallet.getFinancialHistory]", err);
        return [];
      }
    }),

  /**
   * Dismiss historical reserve suggestions (older than today)
   */
  dismissHistoricalReserveSuggestions: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate reservedPending BEFORE dismissal
    const suggestedBefore = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(
        sql`${reserveTransferSuggestions.status} IN ('suggested', 'approved') AND ${reserveTransferSuggestions.ownerId} = ${ctx.user.id}`
      );
    const reservedPendingBefore = suggestedBefore.reduce((sum, s) => sum + Number(s.suggestedAmount || 0), 0);

    // Find historical suggestions
    const historicalSuggestions = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(
        sql`${reserveTransferSuggestions.status} = 'suggested' AND ${reserveTransferSuggestions.createdAt} < ${today} AND ${reserveTransferSuggestions.ownerId} = ${ctx.user.id}`
      );

    if (historicalSuggestions.length === 0) {
      return {
        dismissed: 0,
        reservedPendingBefore,
        reservedPendingAfter: reservedPendingBefore,
        message: "No historical suggestions to dismiss",
      };
    }

    // Dismiss all historical suggestions
    await db
      .update(reserveTransferSuggestions)
      .set({
        status: "dismissed",
        updatedAt: new Date(),
      })
      .where(
        sql`${reserveTransferSuggestions.status} = 'suggested' AND ${reserveTransferSuggestions.createdAt} < ${today} AND ${reserveTransferSuggestions.ownerId} = ${ctx.user.id}`
      );

    // Calculate reservedPending AFTER dismissal
    const suggestedAfter = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(
        sql`${reserveTransferSuggestions.status} IN ('suggested', 'approved') AND ${reserveTransferSuggestions.ownerId} = ${ctx.user.id}`
      );
    const reservedPendingAfter = suggestedAfter.reduce((sum, s) => sum + Number(s.suggestedAmount || 0), 0);

    console.log("[Reserve] DISMISSED HISTORICAL", {
      count: historicalSuggestions.length,
      reservedPendingBefore,
      reservedPendingAfter,
      userId: ctx.user.id,
    });

    return {
      dismissed: historicalSuggestions.length,
      reservedPendingBefore,
      reservedPendingAfter,
      message: `Dismissed ${historicalSuggestions.length} suggestions. Reserved: $${reservedPendingBefore.toFixed(2)} → $${reservedPendingAfter.toFixed(2)}`,
    };
  }),

  /**
   * Wallet stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      let walletRaw = await getWalletByDriverId(ctx.user.id);

      if (!walletRaw) {
        walletRaw = await getOrCreateWallet(ctx.user.id);
      }

      if (!walletRaw) {
        return {
          totalEarnings: 0,
          availableBalance: 0,
          pendingBalance: 0,
          blockedBalance: 0,
        };
      }

      const wallet = safeWallet(walletRaw);

      return {
        totalEarnings: wallet.totalEarnings,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        blockedBalance: wallet.blockedBalance,
      };
    } catch (err) {
      console.error("[wallet.getStats]", err);
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        blockedBalance: 0,
      };
    }
  }),

  /**
   * Get wallet summary with recent transactions and pending withdrawals
   */
  getWalletSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get wallet directly
      let wallet = await getWalletByDriverId(ctx.user.id);
      if (!wallet) {
        wallet = await getOrCreateWallet(ctx.user.id);
      }

      if (!wallet) {
        console.error("[WalletSummary] wallet not found for user", ctx.user.id);
        return {
          wallet: null,
          recentTransactions: [],
          pendingWithdrawals: [],
          totalEarnings: 0,
          availableBalance: 0,
          reservedBalance: 0,
          reservedPending: 0,
          completedReserves: 0,
          withdrawableBalance: 0,
          pendingBalance: 0,
          blockedBalance: 0,
        };
      }

      console.log("[WalletSummary] wallet found", {
        walletId: wallet.id,
        totalEarnings: wallet.totalEarnings,
        availableBalance: wallet.availableBalance,
        reservedBalance: wallet.reservedBalance,
      });

      // Backfill reservedBalance if it's 0 but has completed reserves
      if (Number(wallet.reservedBalance || 0) === 0) {
        const completedReserves = await db
          .select()
          .from(reserveTransferSuggestions)
          .where(
            and(
              eq(reserveTransferSuggestions.ownerId, ctx.user.id),
              eq(reserveTransferSuggestions.status, "completed")
            )
          );

        const totalCompleted = completedReserves.reduce(
          (sum, r) => sum + Number(r.suggestedAmount || 0),
          0
        );

        if (totalCompleted > 0) {
          console.log("[WalletSummary] backfilling reservedBalance", totalCompleted);
          await updateWalletBalance(wallet.id, {
            reservedBalance: String(totalCompleted),
          });
          wallet.reservedBalance = String(totalCompleted);
        }
      }

      // Get pending reserves (suggested + approved)
      const pendingReserves = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(
          and(
            eq(reserveTransferSuggestions.ownerId, ctx.user.id),
            inArray(reserveTransferSuggestions.status, ["suggested", "approved"] as any)
          )
        );

      const reservedPending = pendingReserves.reduce(
        (sum, r) => sum + Number(r.suggestedAmount || 0),
        0
      );

      const safeWalletData = safeWallet(wallet);
      const completedReserves = Number(wallet.reservedBalance || 0);
      const withdrawableBalance = Math.max(0, Number(wallet.availableBalance || 0) - reservedPending);

      console.log("[WalletSummary] computed balances", {
        walletId: wallet.id,
        driverId: wallet.driverId,
        totalEarnings: Number(wallet.totalEarnings || 0),
        availableBalance: Number(wallet.availableBalance || 0),
        reservedBalance: Number(wallet.reservedBalance || 0),
        completedReserves,
        reservedPending,
        withdrawableBalance,
        pendingBalance: Number(wallet.pendingBalance || 0),
        blockedBalance: Number(wallet.blockedBalance || 0),
      });

      const recentTransactions = await getWalletTransactions(wallet.id, 10, 0);
      const pendingWithdrawals = await db.query.withdrawals.findMany({
        where: and(
          eq(withdrawals.driverId, ctx.user.id),
          inArray(withdrawals.status, ["requested", "approved"] as any)
        ),
        orderBy: desc(withdrawals.requestedAt),
      });

      return {
        wallet: safeWalletData,
        recentTransactions: recentTransactions || [],
        pendingWithdrawals: pendingWithdrawals || [],
        totalEarnings: Number(wallet.totalEarnings || 0),
        availableBalance: Number(wallet.availableBalance || 0),
        reservedBalance: Number(wallet.reservedBalance || 0),
        reservedPending,
        completedReserves,
        withdrawableBalance,
        pendingBalance: Number(wallet.pendingBalance || 0),
        blockedBalance: Number(wallet.blockedBalance || 0),
      };
    } catch (err) {
      console.error("[wallet.getWalletSummary]", err);
      return {
        wallet: null,
        recentTransactions: [],
        pendingWithdrawals: [],
        totalEarnings: 0,
        availableBalance: 0,
        reservedBalance: 0,
        reservedPending: 0,
        completedReserves: 0,
        withdrawableBalance: 0,
        pendingBalance: 0,
        blockedBalance: 0,
      };
    }
  }),

  /**
   * Get partner summary with real partner data
   */
  getPartnerSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all partnerships for this user
      const partnerships = await db.query.partnership.findMany({
        where: eq(partnership.userId, ctx.user.id),
      });

      console.log("[PartnerSummary] partnerships count:", partnerships.length);

      if (!partnerships || partnerships.length === 0) {
        console.log("[PartnerSummary] no partnerships found");
        return {
          partners: [],
          totalParticipation: 0,
        };
      }

      // For each partnership, get the partner's wallet
      const partners = [];
      let totalParticipation = 0;

      for (const p of partnerships) {
        const partnerWallet = await getWalletByDriverId(p.partnerId);
        if (partnerWallet) {
          partners.push({
            id: p.id,
            name: p.partnerName,
            role: "Partner",
            participationPercent: p.participationPercent,
            totalAssigned: Number(partnerWallet.totalEarnings || 0),
            availableToWithdraw: Number(partnerWallet.availableBalance || 0),
            reservedBalance: Number(partnerWallet.reservedBalance || 0),
            pendingWithdrawals: Number(partnerWallet.pendingBalance || 0),
            walletStatus: "active",
          });
          totalParticipation += p.participationPercent;
        }
      }

      console.log("[PartnerSummary] partners found:", partners.length, "totalParticipation:", totalParticipation);
      console.log("[PartnerSummary]", partners);

      return {
        partners,
        totalParticipation,
      };
    } catch (err) {
      console.error("[wallet.getPartnerSummary]", err);
      return {
        partners: [],
        totalParticipation: 0,
      };
    }
  }),

  /**
   * Get financial history - all accounting events
   */
  getFinancialHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const history = await getFinancialHistoryFromDb(ctx.user.id, input.limit || 50);
        return { history };
      } catch (err) {
        console.error("[wallet.getFinancialHistory]", err);
        return { history: [] };
      }
    }),

  /**
   * Admin: Backfill reservedBalance for completed reserves
   */
  adminBackfillReservedBalance: protectedProcedure.mutation(async ({ ctx }) => {
    ensureAdminOrOwner(ctx.user.role);
    try {
      const result = await backfillReservedBalance();
      console.log("[Admin] Backfill completed:", result);
      return result;
    } catch (err) {
      console.error("[wallet.adminBackfillReservedBalance]", err);
      return { success: false, error: String(err) };
    }
  }),
});
