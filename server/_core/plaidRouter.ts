import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import { syncPlaidTransactionsForItem } from "./plaid-sync-service";
import { generateReserveSuggestionsFromTransactions } from "../plaid-cashflow";
import {
  getBankAccountById,
  createBankAccount,
  getBankAccountsByUserId,
  deactivateBankAccount,
} from "../db";
import { createLinkToken as createPlaidLinkToken, exchangePublicToken, getAccounts } from "./plaid";

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
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Plaid] exchangeToken START:", {
          publicToken: input.publicToken.substring(0, 20) + "...",
          userId: ctx.user.id,
        });

        // Step 1: Exchange public token for access token
        console.log("[Plaid] Step 1: Calling exchangePublicToken");
        const { accessToken, itemId } = await exchangePublicToken(input.publicToken);
        console.log("[Plaid] Step 1 SUCCESS:", { itemId });
        
        // Step 2: Get accounts from Plaid
        console.log("[Plaid] Step 2: Calling getAccounts with accessToken");
        const accounts = await getAccounts(accessToken);
        console.log("[Plaid] Step 2 SUCCESS:", { 
          accountCount: accounts.length, 
          accounts: accounts.map((a: any) => ({ 
            id: a.account_id, 
            name: a.name, 
            subtype: a.subtype,
            mask: a.mask
          })) 
        });
        
        // Step 3: Create bank account entries for each account
        console.log("[Plaid] Step 3: Creating bank account entries");
        const createdAccounts = [];
        for (const account of accounts) {
          try {
            console.log("[Plaid] Creating bank account for:", { 
              accountId: account.account_id, 
              name: account.name,
              subtype: account.subtype,
              mask: account.mask
            });
            
            // Verification log before insert
            console.log("[DEBUG] saving plaidItemId:", itemId);
            
            const bankAccountData = {
              userId: ctx.user.id,
              bankName: account.name || "Unknown Bank",
              accountType: (account.subtype as "checking" | "savings" | "credit_card" | "other") || "other",
              accountLast4: account.mask || "0000",
              plaidAccountId: account.account_id,
              plaidAccessToken: accessToken,
              plaidItemId: itemId,
              isActive: true,
            };
            
            const result = await createBankAccount(bankAccountData);
            
            console.log("[Plaid] Bank account created SUCCESS:", { insertId: result.insertId });
            createdAccounts.push({ id: result.insertId, name: account.name });
          } catch (accountErr) {
            console.error("[Plaid] Error creating bank account:", accountErr);
          }
        }
        
        console.log("[Plaid] exchangeToken FINAL RESULT:", { 
          success: true, 
          accountCount: createdAccounts.length, 
          createdAccounts,
          itemId
        });
        
        return { 
          success: true, 
          accountCount: createdAccounts.length, 
          itemId, 
          accessToken
        };
      } catch (err) {
        console.error("[Plaid] exchangeToken FAILED:", err);
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
    console.log("[Plaid] getBankAccounts for userId:", ctx.user.id);
    const allAccounts = await getBankAccountsByUserId(ctx.user.id);
    
    // Filter to only valid accounts: must be active and have plaidItemId
    const validAccounts = allAccounts.filter(acc => acc.isActive && acc.plaidItemId);
    
    console.log("[Plaid] getBankAccounts result:", { 
      total: allAccounts.length, 
      valid: validAccounts.length,
      filtered: allAccounts.length - validAccounts.length
    });
    
    return validAccounts;
  }),

  /**
   * Remove a bank account link.
   */
  removeBankAccount: protectedProcedure
    .input(z.object({ bankAccountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Plaid] removeBankAccount input:", { bankAccountId: input.bankAccountId, userId: ctx.user.id });
        await deactivateBankAccount(input.bankAccountId);
        console.log("[Plaid] removeBankAccount SUCCESS");
        return { success: true };
      } catch (err) {
        console.error("[Plaid] removeBankAccount error:", err);
        throw err;
      }
    }),
});
