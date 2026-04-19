/**
 * plaidRouter.ts — tRPC router for Plaid Link integration
 * Endpoints:
 *   - createLinkToken
 *   - exchangeToken
 *   - syncBatch
 *   - syncTransactions (legacy/manual sync by itemId)
 *   - getSyncStatus
 *   - getBankAccounts
 *   - removeBankAccount
 *
 * Notes:
 * - syncBatch processes ONE page of transactions and stores them as financial transactions.
 * - syncTransactions uses the reusable item sync service and also generates reserve suggestions.
 */

import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  syncTransactions as syncPlaidBatch,
  mapPlaidTransaction,
  removeItem,
} from "./plaid";
import {
  createBankAccount,
  getBankAccountsByUserId,
  getBankAccountById,
  deactivateBankAccount,
  createFinancialTransaction,
} from "../db";
import { generateReserveSuggestionsFromTransactions } from "../plaid-cashflow";
import { syncPlaidTransactionsForItem } from "./plaid-sync-service";

/**
 * Read plaidSyncCursor directly from DB.
 * Column is added via startup migration.
 */
async function getPlaidCursor(accountId: number): Promise<string | undefined> {
  try {
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.default.createConnection({
      uri: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: true },
    });

    const [rows] = (await conn.execute(
      "SELECT plaidSyncCursor FROM bank_accounts WHERE id = ?",
      [accountId]
    )) as any;

    await conn.end();
    return rows?.[0]?.plaidSyncCursor ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Persist plaidSyncCursor and update lastSyncedAt.
 */
async function savePlaidCursor(accountId: number, cursor: string): Promise<void> {
  try {
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.default.createConnection({
      uri: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: true },
    });

    await conn.execute(
      "UPDATE bank_accounts SET plaidSyncCursor = ?, lastSyncedAt = NOW() WHERE id = ?",
      [cursor, accountId]
    );

    await conn.end();
  } catch (err) {
    console.error("[Plaid] Failed to save cursor:", err);
  }
}

export const plaidRouter = router({
  /**
   * Step 1: Create a Link token to initialize Plaid Link on the frontend.
   */
  createLinkToken: protectedProcedure
    .input(
      z.object({
        redirectUri: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const linkToken = await createLinkToken(ctx.user.id, input.redirectUri);
      return { linkToken };
    }),

  /**
   * Step 2: Exchange public_token for access_token after user completes Link.
   * Stores bank accounts in DB.
   */
  exchangeToken: protectedProcedure
    .input(
      z.object({
        publicToken: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { accessToken } = await exchangePublicToken(input.publicToken);
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
          // Ignore duplicate inserts
          if (!err?.message?.includes("Duplicate")) {
            throw err;
          }
        }
      }

      return {
        success: true,
        accountCount: storedCount,
      };
    }),

  /**
   * Step 3 (paginated): Sync ONE batch of up to 100 transactions per call.
   * Frontend can call this in a loop until hasMore = false.
   *
   * Returns:
   *   imported  — transactions saved in this batch
   *   hasMore   — true if more pages remain
   *   cursor    — current cursor value
   */
  syncBatch: protectedProcedure
    .input(
      z.object({
        bankAccountId: z.number(),
        batchSize: z.number().min(10).max(100).default(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await getBankAccountById(input.bankAccountId);

      if (!account || !account.plaidAccessToken) {
        throw new Error("Cuenta bancaria no encontrada o sin acceso Plaid");
      }

      // Use stored cursor for incremental sync
      const storedCursor = await getPlaidCursor(input.bankAccountId);

      // Fetch one page from Plaid
      const { added, modified, removed, nextCursor, hasMore } =
        await syncPlaidBatch(account.plaidAccessToken, storedCursor, input.batchSize);

      let imported = 0;

      // Persist each transaction as financial transaction
      for (const tx of added) {
        const mapped = mapPlaidTransaction(tx);

        try {
          await createFinancialTransaction({
            ...mapped,
            createdBy: ctx.user.id,
          });
          imported++;
        } catch {
          // Skip duplicates silently
        }
      }

      // Save cursor after each batch so we can resume
      if (nextCursor) {
        await savePlaidCursor(input.bankAccountId, nextCursor);
      }

      return {
        imported,
        modified: modified.length,
        removed: removed.length,
        hasMore,
        cursor: nextCursor ?? null,
      };
    }),

  /**
   * Legacy / manual sync by itemId.
   * Uses the reusable sync service and then generates reserve suggestions.
   */
  syncTransactions: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const syncResult = await syncPlaidTransactionsForItem({
        userId: ctx.user.id,
        itemId: input.itemId,
      });

      const suggestionResult = await generateReserveSuggestionsFromTransactions({
        ownerId: ctx.user.id,
        transactions: syncResult.importedTransactions,
      });

      return {
        imported: syncResult.imported,
        modified: syncResult.modified,
        removed: syncResult.removed,
        hasMore: syncResult.hasMore,
        suggestionsCreated: suggestionResult.created,
        suggestionSkipped: suggestionResult.skipped,
      };
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
      const cursor = await getPlaidCursor(input.bankAccountId);
      return {
        hasCursor: !!cursor,
        cursor: cursor ?? null,
      };
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
   * Remove a linked bank account (also removes from Plaid, if possible).
   */
  removeBankAccount: protectedProcedure
    .input(
      z.object({
        bankAccountId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const account = await getBankAccountById(input.bankAccountId);

      if (!account) {
        throw new Error("Cuenta no encontrada");
      }

      if (account.plaidAccessToken) {
        try {
          await removeItem(account.plaidAccessToken);
        } catch {
          // Ignore Plaid cleanup failures, still deactivate locally
        }
      }

      await deactivateBankAccount(input.bankAccountId);

      return { success: true };
    }),
});
