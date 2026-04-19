import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import { syncPlaidTransactionsForItem } from "./plaid-sync-service";
import { generateReserveSuggestionsFromTransactions } from "../plaid-cashflow";
import { getBankAccountById } from "../db";

export const plaidRouter = router({
  createLinkToken: publicProcedure
    .input(z.object({ redirectUri: z.string() }))
    .mutation(async ({ input }) => {
      try {
        console.log("[Plaid] createLinkToken input:", {
          redirectUri: input.redirectUri,
          clientId: process.env.PLAID_CLIENT_ID ? "***" : "MISSING",
          environment: process.env.PLAID_ENV,
        });

        // TODO: Call Plaid API to create link token
        // For now, return test token
        const linkToken = "test_link_token_placeholder";
        console.log("[Plaid] createLinkToken response:", { linkToken });
        
        return { linkToken };
      } catch (err) {
        console.error("[Plaid] createLinkToken error:", err);
        throw err;
      }
    }),

  exchangeToken: protectedProcedure
    .input(z.object({ publicToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Plaid] exchangeToken input:", {
          publicToken: input.publicToken.substring(0, 20) + "...",
          userId: ctx.user.id,
        });

        // TODO: Call Plaid API to exchange public token for access token
        // For now, return success
        console.log("[Plaid] exchangeToken response: success");
        
        return { success: true, accountCount: 1 };
      } catch (err) {
        console.error("[Plaid] exchangeToken error:", err);
        throw err;
      }
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
