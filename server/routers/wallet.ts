import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getOrCreateWallet,
  getWalletByDriverId,
  updateWalletBalance,
  addWalletTransaction,
  getWalletTransactions,
  requestWithdrawal,
  getWithdrawals,
  failWithdrawal,
  getWalletSummary,
} from "../db";

/**
 * Helpers
 */
function toNumber(value: any): number {
  const n = typeof value === "number" ? value : parseFloat(value);
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
      const result = await getWalletSummary(ctx.user.id);

      if (!result) {
        return {
          wallet: null,
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
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const wallet = await getWalletByDriverId(ctx.user.id);
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
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const walletRaw = await getWalletByDriverId(ctx.user.id);
        if (!walletRaw) {
          throw new Error("Wallet not found");
        }

        const wallet = safeWallet(walletRaw);

        const available = wallet.availableBalance;
        const minimum = wallet.minimumWithdrawalAmount;

        if (available <= 0) {
          throw new Error("No available balance");
        }

        if (input.amount > available) {
          throw new Error("Insufficient balance");
        }

        if (input.amount < minimum) {
          throw new Error(`Minimum withdrawal is $${minimum}`);
        }

        const fee =
          (input.amount * wallet.withdrawalFeePercent) / 100;

        const withdrawal = await requestWithdrawal(
          wallet.id,
          ctx.user.id,
          {
            amount: input.amount,
            fee,
            method: input.method,
            bankAccountId: input.bankAccountId,
            notes: input.notes,
          }
        );

        await updateWalletBalance(wallet.id, {
          availableBalance: String(available - input.amount),
          pendingBalance: String(wallet.pendingBalance + input.amount),
        });

        return withdrawal;
      } catch (err) {
        console.error("[wallet.requestWithdrawal]", err);
        throw err;
      }
    }),

  /**
   * Withdrawals list
   */
  getWithdrawals: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getWithdrawals(
          ctx.user.id,
          input.limit,
          input.offset
        );
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new Error("Unauthorized");
        }

        const withdrawal = await failWithdrawal(
          input.withdrawalId,
          "Cancelled by admin"
        );

        if (withdrawal) {
          const walletRaw = await getWalletByDriverId(
            withdrawal.driverId
          );

          if (walletRaw) {
            const wallet = safeWallet(walletRaw);

            await updateWalletBalance(wallet.id, {
              availableBalance: String(
                wallet.availableBalance + toNumber(withdrawal.amount)
              ),
              pendingBalance: String(
                Math.max(
                  0,
                  wallet.pendingBalance - toNumber(withdrawal.amount)
                )
              ),
            });
          }
        }

        return withdrawal;
      } catch (err) {
        console.error("[wallet.cancelWithdrawal]", err);
        throw err;
      }
    }),

  /**
   * Manual adjustment
   */
  addAdjustment: protectedProcedure
    .input(
      z.object({
        driverId: z.number(),
        amount: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        const walletRaw = await getWalletByDriverId(input.driverId);
        if (!walletRaw) {
          throw new Error("Wallet not found");
        }

        const wallet = safeWallet(walletRaw);

        const newAvailable = wallet.availableBalance + input.amount;

        await updateWalletBalance(wallet.id, {
          availableBalance: String(newAvailable),
          totalEarnings: String(wallet.totalEarnings + input.amount),
        });

        return await addWalletTransaction(wallet.id, input.driverId, {
          type: "adjustment",
          amount: input.amount,
          description: input.reason,
          status: "completed",
        });
      } catch (err) {
        console.error("[wallet.addAdjustment]", err);
        throw err;
      }
    }),

  /**
   * Wallet stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const walletRaw = await getWalletByDriverId(ctx.user.id);

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
});
