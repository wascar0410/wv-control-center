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
  approveWithdrawal,
  completeWithdrawal,
  failWithdrawal,
  getWalletSummary,
} from "../db";

export const walletRouter = router({
  /**
   * Get current user's wallet
   */
  getMyWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await getWalletByDriverId(ctx.user.id);
    if (!wallet) {
      return await getOrCreateWallet(ctx.user.id);
    }
    return wallet;
  }),

  /**
   * Get wallet summary (wallet + recent transactions + pending withdrawals)
   */
  getWalletSummary: protectedProcedure.query(async ({ ctx }) => {
    return await getWalletSummary(ctx.user.id);
  }),

  /**
   * Get wallet transactions
   */
  getTransactions: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const wallet = await getWalletByDriverId(ctx.user.id);
      if (!wallet) return [];

      return await getWalletTransactions(wallet.id, input.limit, input.offset);
    }),

  /**
   * Request withdrawal
   */
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive("Amount must be positive"),
        method: z.enum(["bank_transfer", "check", "paypal", "venmo", "other"]).default("bank_transfer"),
        bankAccountId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = await getWalletByDriverId(ctx.user.id);
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // Check available balance
      const available = Number(wallet.availableBalance);
      if (available < input.amount) {
        throw new Error("Insufficient balance");
      }

      // Check minimum withdrawal amount
      const minimum = Number(wallet.minimumWithdrawalAmount);
      if (input.amount < minimum) {
        throw new Error(`Minimum withdrawal amount is $${minimum}`);
      }

      const fee = (input.amount * Number(wallet.withdrawalFeePercent)) / 100;

      const withdrawal = await requestWithdrawal(wallet.id, ctx.user.id, {
        amount: input.amount,
        fee,
        method: input.method,
        bankAccountId: input.bankAccountId,
        notes: input.notes,
      });

      // Deduct from available balance
      await updateWalletBalance(wallet.id, {
        availableBalance: String(available - input.amount),
        pendingBalance: String(Number(wallet.pendingBalance) + input.amount),
      });

      return withdrawal;
    }),

  /**
   * Get withdrawal requests
   */
  getWithdrawals: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getWithdrawals(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Cancel withdrawal (admin only)
   */
  cancelWithdrawal: protectedProcedure
    .input(
      z.object({
        withdrawalId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is admin or owner
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new Error("Unauthorized");
      }

      const withdrawal = await failWithdrawal(
        input.withdrawalId,
        "Cancelled by admin"
      );

      // Restore balance
      if (withdrawal) {
        const wallet = await getWalletByDriverId(withdrawal.driverId);
        if (wallet) {
          const available = Number(wallet.availableBalance) + Number(withdrawal.amount);
          const pending = Math.max(0, Number(wallet.pendingBalance) - Number(withdrawal.amount));
          await updateWalletBalance(wallet.id, {
            availableBalance: String(available),
            pendingBalance: String(pending),
          });
        }
      }

      return withdrawal;
    }),

  /**
   * Add manual adjustment (admin only)
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
      // Verify user is admin
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const wallet = await getWalletByDriverId(input.driverId);
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const newAvailable = Number(wallet.availableBalance) + input.amount;

      await updateWalletBalance(wallet.id, {
        availableBalance: String(newAvailable),
        totalEarnings: String(Number(wallet.totalEarnings) + input.amount),
      });

      const transaction = await addWalletTransaction(
        wallet.id,
        input.driverId,
        {
          type: "adjustment",
          amount: input.amount,
          description: input.reason,
          status: "completed",
        }
      );

      return transaction;
    }),

  /**
   * Get wallet statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await getWalletByDriverId(ctx.user.id);
    if (!wallet) {
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        blockedBalance: 0,
      };
    }

    return {
      totalEarnings: Number(wallet.totalEarnings),
      availableBalance: Number(wallet.availableBalance),
      pendingBalance: Number(wallet.pendingBalance),
      blockedBalance: Number(wallet.blockedBalance),
    };
  }),
});
