/**
 * plaidRouter.ts — tRPC router for Plaid Link integration
 * Endpoints: createLinkToken, exchangeToken, syncTransactions, getBankAccounts, removeBankAccount
 */
import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  syncTransactions,
  mapPlaidTransaction,
  removeItem,
} from "./plaid";
import {
  createBankAccount,
  getBankAccountsByUserId,
  getBankAccountById,
  updateBankAccount,
  deactivateBankAccount,
  createFinancialTransaction,
} from "../db";

export const plaidRouter = router({
  /**
   * Step 1: Create a Link token to initialize Plaid Link on the frontend.
   * Pass redirectUri for OAuth institutions (required for web).
   */
  createLinkToken: protectedProcedure
    .input(z.object({ redirectUri: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const linkToken = await createLinkToken(ctx.user.id, input.redirectUri);
      return { linkToken };
    }),

  /**
   * Step 2: Exchange public_token for access_token after user completes Link.
   * Stores bank accounts in DB.
   */
  exchangeToken: protectedProcedure
    .input(z.object({ publicToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { accessToken, itemId } = await exchangePublicToken(input.publicToken);

      // Get account details from Plaid
      const accounts = await getAccounts(accessToken);

      let storedCount = 0;
      for (const account of accounts) {
        try {
          await createBankAccount({
            userId: ctx.user.id,
            bankName: account.name || "Bank Account",
            accountType: (account.subtype || "other") as any,
            accountLast4: account.mask || "****",
            plaidAccountId: account.account_id,
            plaidAccessToken: accessToken,
          });
          storedCount++;
        } catch (err: any) {
          if (!err.message?.includes("Duplicate")) throw err;
        }
      }

      return { success: true, accountCount: storedCount };
    }),

  /**
   * Step 3: Sync transactions for a bank account (incremental).
   * Imports new transactions into financial_transactions table.
   */
  syncTransactions: protectedProcedure
    .input(z.object({ bankAccountId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const account = await getBankAccountById(input.bankAccountId);
      if (!account || !account.plaidAccessToken) {
        throw new Error("Cuenta bancaria no encontrada o sin acceso Plaid");
      }

      const { added, modified, removed, nextCursor } = await syncTransactions(
        account.plaidAccessToken,
        undefined // cursor stored separately
      );

      let imported = 0;
      for (const tx of added) {
        const mapped = mapPlaidTransaction(tx);
        try {
          await createFinancialTransaction({
            ...mapped,
            createdBy: ctx.user.id,
          });
          imported++;
        } catch {
          // Skip duplicates
        }
      }

      // Update lastSyncedAt
      await updateBankAccount(input.bankAccountId, { lastSyncedAt: new Date() });

      return { imported, modified: modified.length, removed: removed.length };
    }),

  /**
   * Get all linked bank accounts for the current user.
   */
  getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await getBankAccountsByUserId(ctx.user.id);
    return accounts.map((a: any) => ({
      id: a.id,
      bankName: a.bankName,
      accountType: a.accountType,
      accountLast4: a.accountLast4,
      plaidAccountId: a.plaidAccountId,
      hasPlaid: !!a.plaidAccessToken,
      lastSyncedAt: a.lastSyncedAt,
    }));
  }),

  /**
   * Remove a linked bank account (also removes from Plaid).
   */
  removeBankAccount: protectedProcedure
    .input(z.object({ bankAccountId: z.number() }))
    .mutation(async ({ input }) => {
      const account = await getBankAccountById(input.bankAccountId);
      if (!account) throw new Error("Cuenta no encontrada");

      if (account.plaidAccessToken) {
        try { await removeItem(account.plaidAccessToken); } catch {}
      }

      await deactivateBankAccount(input.bankAccountId);
      return { success: true };
    }),
});
