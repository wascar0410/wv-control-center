import { z } from "zod";
import { eq, sql } from "drizzle-orm";
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
   * Get current user's wallet
   */
  getMyWallet: protectedProcedure.query(async ({ ctx }) => {
    try {
      let wallet = await getWalletByDriverId(ctx.user.id);

      if (!wallet) {
        wallet = await getOrCreateWallet(ctx.user.id);
      }

      return safeWallet(wallet);
    } catch (err) {
      console.error("[wallet.getMyWallet]", err);
      return null;
    }
  }),

  /**
   * Wallet summary
   */
  getWalletSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await getWalletSummaryFromDb(ctx.user.id);

      if (!result) {
        const wallet = await getOrCreateWallet(ctx.user.id);
        return {
          wallet: safeWallet(wallet),
          recentTransactions: [],
          pendingWithdrawals: [],
        };
      }

      return {
        wallet: safeWallet(result.wallet),
        recentTransactions: result.recentTransactions || [],
        pendingWithdrawals: result.pendingWithdrawals || [],
      };
    } catch (err) {
      console.error("[wallet.getWalletSummary]", err);
      return {
        wallet: null,
        recentTransactions: [],
        pendingWithdrawals: [],
      };
    }
  }),

  /**
   * Transactions
   */
  getTransactions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        let wallet = await getWalletByDriverId(ctx.user.id);

        if (!wallet) {
          wallet = await getOrCreateWallet(ctx.user.id);
        }

        if (!wallet) return [];

        return await getWalletTransactions(wallet.id, input.limit, input.offset);
      } catch (err) {
        console.error("[wallet.getTransactions]", err);
        return [];
      }
    }),

  /**
   * Request withdrawal
   */
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        method: z
          .enum(["bank_transfer", "check", "paypal", "venmo", "other"])
          .default("bank_transfer"),
        bankAccountId: z.string().optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        let walletRaw = await getWalletByDriverId(ctx.user.id);

        if (!walletRaw) {
          walletRaw = await getOrCreateWallet(ctx.user.id);
        }

        if (!walletRaw) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to initialize wallet",
          });
        }

        const wallet = safeWallet(walletRaw);

        if (!wallet || !wallet.id) {
          console.error("[wallet.requestWithdrawal] Invalid wallet object:", wallet);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to validate wallet",
          });
        }

        if (input.method === "bank_transfer" && !input.bankAccountId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Bank account is required for bank transfer withdrawals",
          });
        }

        const available = wallet.availableBalance;
        const minimum = wallet.minimumWithdrawalAmount || 50;

        console.log("[wallet.requestWithdrawal] Wallet state:", {
          walletId: wallet.id,
          available,
          minimum,
          requestAmount: input.amount,
          method: input.method,
        });

        if (available <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No available balance",
          });
        }

        if (input.amount > available) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient available balance",
          });
        }

        if (input.amount < minimum) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Minimum withdrawal is $${minimum}`,
          });
        }

        const db = await getDb();
        if (db) {
          const activeBlocks = await db.query.paymentBlocks.findMany({
            where: (pb, { eq, and }) =>
              and(eq(pb.driverId, ctx.user.id), eq(pb.status, "active")),
          });

          if (activeBlocks.length > 0) {
            const blockedAmount = activeBlocks.reduce(
              (sum, b) => sum + Number(b.blockedAmount || 0),
              0
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot withdraw: $${blockedAmount} blocked due to missing BOL/POD or compliance holds`,
            });
          }
        }

        const fee = (input.amount * wallet.withdrawalFeePercent) / 100;

        const withdrawal = await requestWithdrawal(wallet.id, ctx.user.id, {
          amount: input.amount,
          fee,
          method: input.method,
          bankAccountId: input.bankAccountId,
          notes: input.notes,
        });

        return withdrawal;
      } catch (err) {
        console.error("[wallet.requestWithdrawal]", err);

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to request withdrawal",
        });
      }
    }),

  // NOTE: Plaid endpoints moved to plaidRouter for consolidation
  // Use trpc.plaid.createLinkToken instead of wallet.createPlaidLinkToken
  // Use trpc.plaid.exchangeToken instead of wallet.exchangePlaidPublicToken
  // Use trpc.plaid.getBankAccounts instead of wallet.getLinkedBankAccounts

  /**
   * Withdrawals list
   */
  getWithdrawals: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getWithdrawals(ctx.user.id, input.limit, input.offset);
      } catch (err) {
        console.error("[wallet.getWithdrawals]", err);
        return [];
      }
    }),

  /**
   * Cancel withdrawal
   */
  cancelWithdrawal: protectedProcedure
    .input(
      z.object({
        withdrawalId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        ensureAdminOrOwner(ctx.user.role);

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const existing = await db.query.withdrawals.findFirst({
          where: (w, { eq }) => eq(w.id, input.withdrawalId),
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Withdrawal not found",
          });
        }

        if (existing.status !== "requested" && existing.status !== "approved") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Withdrawal cannot be cancelled in its current status",
          });
        }

        const withdrawal = await failWithdrawal(input.withdrawalId, "Cancelled by admin");

        if (withdrawal) {
          const walletRaw = await getWalletByDriverId(withdrawal.driverId);

          if (walletRaw) {
            const wallet = safeWallet(walletRaw);

            await updateWalletBalance(wallet.id, {
              availableBalance: String(
                wallet.availableBalance + toNumber(withdrawal.amount)
              ),
              pendingBalance: String(
                Math.max(0, wallet.pendingBalance - toNumber(withdrawal.amount))
              ),
            });

            await addWalletTransaction(wallet.id, withdrawal.driverId, {
              type: "adjustment",
              amount: toNumber(withdrawal.amount),
              withdrawalId: withdrawal.id,
              description: "Withdrawal cancelled and funds returned",
              status: "completed",
            });
          }
        }

        return withdrawal;
      } catch (err) {
        console.error("[wallet.cancelWithdrawal]", err);

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel withdrawal",
        });
      }
    }),

  /**
   * Manual adjustment
   */
  addAdjustment: protectedProcedure
    .input(
      z.object({
        driverId: z.number().optional(),
        amount: z.number(),
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        ensureAdminOrOwner(ctx.user.role);

        const targetDriverId = input.driverId ?? ctx.user.id;

        let walletRaw = await getWalletByDriverId(targetDriverId);
        if (!walletRaw) {
          walletRaw = await getOrCreateWallet(targetDriverId);
        }

        if (!walletRaw) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to initialize wallet",
          });
        }

        const wallet = safeWallet(walletRaw);
        const newAvailable = wallet.availableBalance + input.amount;

        if (newAvailable < 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Adjustment would make available balance negative",
          });
        }

        const newTotalEarnings =
          input.amount >= 0
            ? wallet.totalEarnings + input.amount
            : wallet.totalEarnings;

        await updateWalletBalance(wallet.id, {
          availableBalance: String(newAvailable),
          totalEarnings: String(newTotalEarnings),
        });

        const transaction = await addWalletTransaction(wallet.id, targetDriverId, {
          type: "adjustment",
          amount: input.amount,
          description: input.reason,
          status: "completed",
        });

        const updatedWalletRaw = await getWalletByDriverId(targetDriverId);

        return {
          success: true,
          transaction,
          wallet: safeWallet(updatedWalletRaw),
        };
      } catch (err) {
        console.error("[wallet.addAdjustment]", err);

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to add adjustment",
        });
      }
    }),

  /**
   * Partner wallet summary
   */
  getPartnerSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      ensureAdminOrOwner(ctx.user.role);

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const users = await db.query.users.findMany({
        where: (u, { or, eq }) =>
          or(
            eq(u.email, "wascar.ortiz0410@gmail.com"),
            eq(u.email, "yisvel10@gmail.com")
          ),
      });

      const partners = await Promise.all(
        users.map(async (user) => {
          let walletRaw = await getWalletByDriverId(user.id);
          if (!walletRaw) {
            walletRaw = await getOrCreateWallet(user.id);
          }

          const wallet = safeWallet(walletRaw);
          const userWithdrawals = await getWithdrawals(user.id, 200, 0);

          const totalWithdrawn = (userWithdrawals || [])
            .filter((w: any) => String(w.status || "") === "completed")
            .reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);

          return {
            id: user.id,
            name: user.name || user.email || `User ${user.id}`,
            totalAssigned: Number(wallet?.totalEarnings ?? 0),
            totalWithdrawn,
            availableToWithdraw: Number(wallet?.availableBalance ?? 0),
            pendingWithdrawals: Number(wallet?.pendingBalance ?? 0),
            walletStatus: (wallet?.status || "active") as
              | "active"
              | "suspended"
              | "pending",
          };
        })
      );

      return partners;
    } catch (err) {
      console.error("[wallet.getPartnerSummary]", err);
      return [];
    }
  }),

  normalizeLegacyPendingWithdrawals: protectedProcedure
    .input(
      z.object({
        driverId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        ensureAdminOrOwner(ctx.user.role);

        const targetDriverId = input.driverId ?? ctx.user.id;

        const result = await normalizeLegacyPendingWithdrawals(targetDriverId);

        return {
          success: true,
          driverId: targetDriverId,
          ...result,
        };
      } catch (err) {
        console.error("[wallet.normalizeLegacyPendingWithdrawals]", err);

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to normalize legacy pending withdrawals",
        });
      }
    }),

  /**
   * Auto Reserve System - Consolidated endpoints
   */
  getReserveSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const suggestions = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

      const suggested = suggestions.filter((s) => s.status === "suggested").length;
      const approved = suggestions.filter((s) => s.status === "approved").length;
      const completed = suggestions.filter((s) => s.status === "completed").length;
      const dismissed = suggestions.filter((s) => s.status === "dismissed").length;

      const totalSuggested = suggestions
        .filter((s) => s.status === "suggested")
        .reduce((sum, s) => sum + toNumber(s.suggestedAmount), 0);

      return {
        suggested,
        approved,
        completed,
        dismissed,
        totalSuggested,
      };
    } catch (err) {
      console.error("[wallet.getReserveSummary]", err);
      return {
        suggested: 0,
        approved: 0,
        completed: 0,
        dismissed: 0,
        totalSuggested: 0,
      };
    }
  }),

  dismissReserveSuggestion: protectedProcedure
    .input(z.object({ suggestionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const suggestion = await db
          .select()
          .from(reserveTransferSuggestions)
          .where(eq(reserveTransferSuggestions.id, input.suggestionId))
          .limit(1);

        if (!suggestion.length || suggestion[0].ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Suggestion not found or unauthorized",
          });
        }

        await db
          .update(reserveTransferSuggestions)
          .set({ status: "dismissed", updatedAt: new Date() })
          .where(eq(reserveTransferSuggestions.id, input.suggestionId));

        return { success: true };
      } catch (err) {
        console.error("[wallet.dismissReserveSuggestion]", err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to dismiss suggestion",
        });
      }
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

      // 2. calcular nuevo balance
      const amount = Number(s.suggestedAmount || 0);
      const newAvailableBalance = Math.max(0, Number(wallet.availableBalance || 0) - amount);

      // 3. actualizar wallet
      await updateWalletBalance(wallet.id, {
        availableBalance: String(newAvailableBalance),
      });

      // 4. marcar suggestion como completed
      await db
        .update(reserveTransferSuggestions)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reserveTransferSuggestions.id, input.suggestionId));

      // 5. log claro
      console.log("[Reserve] COMPLETED + WALLET UPDATED", {
        suggestionId: input.suggestionId,
        amount,
        previousAvailableBalance: wallet.availableBalance,
        newAvailableBalance,
        userId: ctx.user.id,
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
      const wallet = safeWallet(walletRaw);
      const availableBalance = wallet?.availableBalance ?? 0;

      const suggestions = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

      const reservedPending = suggestions
        .filter((s) => s.status === "suggested" || s.status === "approved")
        .reduce((sum, s) => sum + toNumber(s.suggestedAmount), 0);

      const withdrawable = Math.max(0, availableBalance - reservedPending);

      return {
        availableBalance,
        reservedPending,
        withdrawable,
      };
    } catch (err) {
      console.error("[wallet.getWithdrawableBalance]", err);
      return {
        availableBalance: 0,
        reservedPending: 0,
        withdrawable: 0,
      };
    }
  }),

  /**
   * Validate withdrawal - Check if withdrawal is allowed
   */
  validateWithdrawal: protectedProcedure
    .input(z.object({ amount: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let walletRaw = await getWalletByDriverId(ctx.user.id);
        if (!walletRaw) {
          walletRaw = await getOrCreateWallet(ctx.user.id);
        }
        const wallet = safeWallet(walletRaw);
        const availableBalance = wallet?.availableBalance ?? 0;

        const suggestions = await db
          .select()
          .from(reserveTransferSuggestions)
          .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

        const reservedPending = suggestions
          .filter((s) => s.status === "suggested" || s.status === "approved")
          .reduce((sum, s) => sum + toNumber(s.suggestedAmount), 0);

        const withdrawable = Math.max(0, availableBalance - reservedPending);
        const isAllowed = input.amount <= withdrawable && input.amount > 0;

        return {
          isAllowed,
          availableBalance,
          reservedPending,
          withdrawable,
          requestedAmount: input.amount,
          reason: !isAllowed
            ? input.amount > withdrawable
              ? "Insufficient withdrawable balance (some funds are reserved)"
              : "Invalid amount"
            : undefined,
        };
      } catch (err) {
        console.error("[wallet.validateWithdrawal]", err);
        return {
          isAllowed: false,
          availableBalance: 0,
          reservedPending: 0,
          withdrawable: 0,
          requestedAmount: input.amount,
          reason: "Failed to validate withdrawal",
        };
      }
    }),

  /**
   * Get financial history - All cash flow events
   */
  getFinancialHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const events: any[] = [];

        let wallet = await getWalletByDriverId(ctx.user.id);
        if (!wallet) {
          wallet = await getOrCreateWallet(ctx.user.id);
        }

        if (wallet) {
          const walletTxns = await getWalletTransactions(wallet.id, 1000, 0);
          events.push(
            ...walletTxns.map((t: any) => ({
              id: `wallet-${t.id}`,
              type:
                t.type === "deposit"
                  ? "Deposit"
                  : t.type === "withdrawal"
                    ? "Withdrawal"
                    : "Adjustment",
              amount: toNumber(t.amount),
              description: t.description,
              date: t.createdAt,
              category: "wallet",
            }))
          );
        }

        const suggestions = await db
          .select()
          .from(reserveTransferSuggestions)
          .where(eq(reserveTransferSuggestions.ownerId, ctx.user.id));

        events.push(
          ...suggestions.map((s: any) => {
            let typeLabel = "Reserve Suggested";
            if (s.status === "completed") typeLabel = "Reserve Completed";
            if (s.status === "dismissed") typeLabel = "Reserve Dismissed";
            if (s.status === "approved") typeLabel = "Reserve Approved";

            return {
              id: `suggestion-${s.id}`,
              type: typeLabel,
              amount: toNumber(s.suggestedAmount),
              description: s.reason || "Reserve transfer",
              date: s.status === "completed" ? s.completedAt : s.createdAt,
              category: "reserve",
              status: s.status,
            };
          })
        );

        const accounts = await db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.userId, ctx.user.id));

        events.push(
          ...accounts.map((a: any) => ({
            id: `account-${a.id}`,
            type: a.isActive ? "Bank Connected" : "Bank Disconnected",
            amount: 0,
            description: `${a.bankName} ****${a.accountLast4}`,
            date: a.isActive ? a.createdAt : a.updatedAt,
            category: "bank",
          }))
        );

        events.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

        const paginated = events.slice(input.offset, input.offset + input.limit);

        return {
          events: paginated,
          total: events.length,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (err) {
        console.error("[wallet.getFinancialHistory]", err);
        return {
          events: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        };
      }
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
   * Dismiss historical reserve suggestions (older than today)
   */
  dismissHistoricalReserveSuggestions: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const historicalSuggestions = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(
        sql`${reserveTransferSuggestions.status} = 'suggested' AND ${reserveTransferSuggestions.createdAt} < ${today} AND ${reserveTransferSuggestions.ownerId} = ${ctx.user.id}`
      );

    if (historicalSuggestions.length === 0) {
      console.log("[Reserve] No historical suggestions to dismiss");
      return { dismissed: 0, message: "No historical suggestions found" };
    }

    await db
      .update(reserveTransferSuggestions)
      .set({
        status: "dismissed",
        updatedAt: new Date(),
      })
      .where(
        sql`${reserveTransferSuggestions.status} = 'suggested' AND ${reserveTransferSuggestions.createdAt} < ${today} AND ${reserveTransferSuggestions.ownerId} = ${ctx.user.id}`
      );

    console.log("[Reserve] DISMISSED HISTORICAL", {
      count: historicalSuggestions.length,
      userId: ctx.user.id,
      beforeDate: today.toISOString(),
    });

    return {
      dismissed: historicalSuggestions.length,
      message: `Dismissed ${historicalSuggestions.length} historical reserve suggestions`,
    };
  }),
});
