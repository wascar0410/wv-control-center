import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { wallets, bankAccounts } from "../../drizzle/schema";
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
  getWalletSummary,
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
<<<<<<< Updated upstream
        const available = wallet.availableBalance;
        const minimum = wallet.minimumWithdrawalAmount || 50;

        if (available <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No available balance",
          });
=======
        
        // Validate wallet has required fields
        if (!wallet || !wallet.id) {
          console.error("[wallet.requestWithdrawal] Invalid wallet object:", wallet);
          throw new Error("Wallet configuration error");
        }

        const available = wallet.availableBalance;
        const minimum = wallet.minimumWithdrawalAmount;
        
        console.log("[wallet.requestWithdrawal] Wallet state:", {
          walletId: wallet.id,
          available,
          minimum,
          requestAmount: input.amount,
        });

        if (available <= 0) {
          console.warn("[wallet.requestWithdrawal] No available balance", { available });
          throw new Error("No available balance");
>>>>>>> Stashed changes
        }

        if (input.amount > available) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient balance",
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

        // Important:
        // requestWithdrawal() in db already creates the withdrawal,
        // logs the wallet transaction, and updates wallet balances.
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

  /**
   * Create Plaid link token
   */
  createPlaidLinkToken: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Plaid not configured",
        });
      }

      const response = await fetch("https://sandbox.plaid.com/link/token/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: { client_user_id: String(ctx.user.id) },
          client_name: "WV Control Center",
          language: "es",
          country_codes: ["US"],
          products: ["auth"],
          client_id: process.env.PLAID_CLIENT_ID,
          secret: process.env.PLAID_SECRET,
        }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Plaid link token",
        });
      }

      const data = await response.json();
      return { linkToken: data.link_token };
    } catch (err) {
      console.error("[wallet.createPlaidLinkToken]", err);

      if (err instanceof TRPCError) throw err;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Plaid link token",
      });
    }
  }),

  /**
   * Exchange Plaid public token
   */
  exchangePlaidPublicToken: protectedProcedure
    .input(
      z.object({
        publicToken: z.string(),
        accountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Plaid not configured",
          });
        }

        const response = await fetch("https://sandbox.plaid.com/item/public_token/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: process.env.PLAID_CLIENT_ID,
            secret: process.env.PLAID_SECRET,
            public_token: input.publicToken,
          }),
        });

        if (!response.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to exchange Plaid token",
          });
        }

        const data = await response.json();
        const accessToken = data.access_token;
        const itemId = data.item_id;

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        await db.insert(bankAccounts).values({
          userId: ctx.user.id,
          plaidItemId: itemId,
          plaidAccessToken: accessToken,
          accountId: input.accountId,
          accountName: "Connected Bank Account",
          accountMask: "",
          bankName: "",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { success: true, message: "Bank account connected" };
      } catch (err) {
        console.error("[wallet.exchangePlaidPublicToken]", err);

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exchange Plaid token",
        });
      }
    }),

  /**
   * Get linked bank accounts
   */
  getLinkedBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const accounts = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.userId, ctx.user.id));

      return accounts.map((acc) => ({
        id: acc.id,
        name: acc.accountName,
        mask: acc.accountMask,
        institutionName: acc.bankName,
        isActive: acc.isActive,
      }));
    } catch (err) {
      console.error("[wallet.getLinkedBankAccounts]", err);
      return [];
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
        driverId: z.number(),
        amount: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized",
          });
        }

        const walletRaw = await getWalletByDriverId(input.driverId);
        if (!walletRaw) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Wallet not found",
          });
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

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add adjustment",
        });
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
