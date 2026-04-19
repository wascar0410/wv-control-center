import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import { syncPlaidTransactionsForItem } from "./plaid-sync-service";
import { generateReserveSuggestionsFromTransactions } from "../plaid-cashflow";
import { getBankAccountById } from "../db";
import { createLinkToken as createPlaidLinkToken, exchangePublicToken } from "./plaid";
import { getAccounts } from "./plaid";
import { createBankAccount, getBankAccountsByUserId } from "../db";

export const plaidRouter = router({
  createLinkToken: publicProcedure
    .input(z.object({ redirectUri: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        console.log("[Plaid] createLinkToken input:", {
          redirectUri: input.redirectUri,
          clientId: process.env.PLAID_CLIENT_ID ? "***" : "MISSING",
          environment: process.env.PLAID_ENV,
        });

        // Generate a unique user ID for this session
        const sessionUserId = Math.floor(Math.random() * 1000000);
        
        // Call real Plaid API to create link token
        const linkToken = await createPlaidLinkToken(sessionUserId, input.redirectUri);
        console.log("[Plaid] createLinkToken response:", { linkToken });
        
        return { linkToken };
      } catch (err) {
        console.error("[Plaid] createLinkToken error:", err);
        throw err;
      }
    }),

 exchangeToken: protectedProcedure
  .input(z.object({ publicToken: z.string() }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    const { accessToken, itemId } = await exchangePublicToken(input.publicToken);

    console.log("[Plaid] exchangePublicToken:", { itemId });

    const accounts = await getAccounts(accessToken);

    let storedCount = 0;

    for (const account of accounts) {
      try {
        await createBankAccount({
          userId: ctx.user.id,
          bankName: account.name || account.official_name || "Bank Account",
          accountType: (account.subtype || "other") as any,
          accountLast4: account.mask || "****",
          plaidAccountId: account.account_id,
          plaidAccessToken: accessToken,
          plaidItemId: itemId,
        });

        storedCount++;
      } catch (err: any) {
        console.error("[Plaid] createBankAccount error:", err?.message || err);
      }
    }

    console.log("[Plaid] exchangeToken success:", {
      userId: ctx.user.id,
      itemId,
      accountCount: accounts.length,
      storedCount,
    });

    return {
      success: true,
      itemId,
      accountCount: storedCount,
    };
  }),
  /**
   * Manual sync by bankAccountId.
   * Looks up the account, gets its plaidItemId, syncs transactions, and generates reserve suggestions.
   */
  syncTransactions: protectedProcedure
    .input(
      z.object({
        bankAccountId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Sync] input:", input);
        console.log("[Sync] ctx.user:", ctx.user);

        if (!ctx.user) {
          throw new Error("User not authenticated in syncTransactions");
        }

        const account = await getBankAccountById(input.bankAccountId);
        console.log("[Sync] account:", account);

        if (!account) {
          throw new Error("Bank account not found");
        }

        if (!account.plaidItemId) {
          throw new Error("Account has no plaidItemId");
        }

        console.log("[Sync] Starting syncPlaidTransactionsForItem with itemId:", account.plaidItemId);
        const syncResult = await syncPlaidTransactionsForItem({
          userId: ctx.user.id,
          itemId: account.plaidItemId,
        });
        console.log("[Sync] syncResult:", syncResult);

        console.log("[Sync] Starting generateReserveSuggestionsFromTransactions");
        const suggestionResult = await generateReserveSuggestionsFromTransactions({
          ownerId: ctx.user.id,
          transactions: syncResult.importedTransactions,
        });
        console.log("[Sync] suggestionResult:", suggestionResult);

        return {
          imported: syncResult.imported,
          modified: syncResult.modified,
          removed: syncResult.removed,
          hasMore: syncResult.hasMore,
          suggestionsCreated: suggestionResult.created,
          suggestionSkipped: suggestionResult.skipped,
        };
      } catch (err) {
        console.error("[Sync ERROR]:", err);
        throw err;
      }
    }),

  /**
   * Get sync status for a bank account.
   * hasCursor = true means at least one sync has been completed.
   */
  getSyncStatus: protectedProcedure
    .input(
      z.object({
        bankAccountId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const account = await getBankAccountById(input.bankAccountId);

      if (!account) {
        throw new Error("Account not found");
      }

      return {
        hasCursor: !!account.plaidCursor,
        cursor: account.plaidCursor,
      };
    }),

  /**
   * Get all linked bank accounts for the current user.
   */
  getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    // Implementation here
    return [];
  }),

  /**
   * Remove a bank account link.
   */
  removeBankAccount: protectedProcedure
    .input(z.object({ bankAccountId: z.number() }))
    .mutation(async ({ input }) => {
      // Implementation here
      return { success: true };
    }),
});
