import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./trpc";
import { syncPlaidTransactionsForItem } from "./plaid-sync-service";
import { generateReserveSuggestionsFromTransactions } from "../plaid-cashflow";
import {
  getBankAccountById,
  createBankAccount,
  getBankAccountsByUserId,
  deactivateBankAccount,
  getDb,
} from "../db";
import {
  createLinkToken as createPlaidLinkToken,
  exchangePublicToken,
  getAccounts,
} from "./plaid";
import { bankAccountClassifications } from "../../drizzle/schema";


// Helper para company-level scope
const getScopedUserId = (ctx: any) => {
  const isOwnerOrAdmin = ctx.user.role === "owner" || ctx.user.role === "admin";
  return isOwnerOrAdmin ? 1 : ctx.user.id;
};
export const plaidRouter = router({
  createLinkToken: protectedProcedure
    .input(z.object({ redirectUri: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Plaid] createLinkToken input:", {
          userId: getScopedUserId(ctx),
          redirectUri: input.redirectUri,
          clientId: process.env.PLAID_CLIENT_ID ? "***" : "MISSING",
          environment: process.env.PLAID_ENV,
        });

        const linkToken = await createPlaidLinkToken(
          getScopedUserId(ctx),
          input.redirectUri
        );

        console.log("[Plaid] createLinkToken response:", {
          linkToken:
            typeof linkToken === "string"
              ? `${linkToken.slice(0, 20)}...`
              : "invalid",
        });

        return { linkToken };
      } catch (err) {
        console.error("[Plaid] createLinkToken error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to create Plaid link token",
        });
      }
    }),

  exchangeToken: protectedProcedure
    .input(z.object({ publicToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Plaid] exchangeToken START:", {
          publicToken: input.publicToken.substring(0, 20) + "...",
          userId: getScopedUserId(ctx),
        });

        const { accessToken, itemId } = await exchangePublicToken(
          input.publicToken
        );

        console.log("[Plaid] exchangePublicToken SUCCESS:", { itemId });

        const accounts = await getAccounts(accessToken);

        console.log("[Plaid] getAccounts SUCCESS:", {
          accountCount: accounts.length,
          accounts: accounts.map((a: any) => ({
            id: a.account_id,
            name: a.name,
            subtype: a.subtype,
            mask: a.mask,
          })),
        });

        const createdAccounts: Array<{ id: number; name: string }> = [];
        let isFirstAccount = true;

        for (const account of accounts) {
          try {
            console.log("[Plaid] Creating bank account:", {
              accountId: account.account_id,
              name: account.name,
              subtype: account.subtype,
              mask: account.mask,
              plaidItemId: itemId,
            });

            const bankAccountData = {
              userId: getScopedUserId(ctx),
              bankName: account.name || "Unknown Bank",
              accountType:
                (account.subtype as
                  | "checking"
                  | "savings"
                  | "credit_card"
                  | "other") || "other",
              accountLast4: account.mask || "0000",
              plaidAccountId: account.account_id,
              plaidAccessToken: accessToken,
              plaidItemId: itemId,
              isActive: true,
            };

            const result = await createBankAccount(bankAccountData);

            console.log("[Plaid] createBankAccount SUCCESS:", {
              insertId: result.insertId,
            });

            createdAccounts.push({
              id: result.insertId,
              name: account.name || "Unknown Bank",
            });

            if (isFirstAccount) {
              try {
                const db = await getDb();
                if (db) {
                  console.log(
                    "[Plaid] Auto-classifying first account as operating:",
                    { bankAccountId: result.insertId }
                  );

                  await db
                    .insert(bankAccountClassifications)
                    .values({
                      bankAccountId: result.insertId,
                      classification: "operating",
                      label: "Operating Account",
                      description: "Auto-classified as first connected account",
                      isActive: true,
                    })
                    .onDuplicateKeyUpdate({
                      set: {
                        classification: "operating",
                        label: "Operating Account",
                        description:
                          "Auto-classified as first connected account",
                        isActive: true,
                      },
                    });

                  console.log("[Plaid] Auto-classification SUCCESS");
                }
              } catch (classErr) {
                console.error(
                  "[Plaid] Auto-classification error (non-fatal):",
                  classErr
                );
              }

              isFirstAccount = false;
            }
          } catch (accountErr) {
            console.error("[Plaid] Error creating bank account:", accountErr);
          }
        }

        console.log("[Plaid] exchangeToken COMPLETE:", {
          success: true,
          itemId,
          accountCount: createdAccounts.length,
          createdAccounts,
        });

        return {
          success: true,
          accountCount: createdAccounts.length,
          createdAccounts,
          itemId,
        };
      } catch (err) {
        console.error("[Plaid] exchangeToken FAILED:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to exchange token",
        });
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
        console.log("[Sync] ctx.user:", { id: getScopedUserId(ctx), role: ctx.user.role });

        const account = await getBankAccountById(input.bankAccountId);
        console.log("[Sync] account:", account);

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bank account not found",
          });
        }

        if (Number(account.userId) !== Number(getScopedUserId(ctx))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized: account does not belong to user",
          });
        }

        if (!account.plaidItemId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Account has no plaidItemId",
          });
        }

        console.log(
          "[Sync] Starting syncPlaidTransactionsForItem with itemId:",
          account.plaidItemId
        );

        const syncResult = await syncPlaidTransactionsForItem({
          userId: getScopedUserId(ctx),
          itemId: account.plaidItemId,
        });

        console.log("[Sync] syncResult:", syncResult);
        console.log("[Sync] Starting generateReserveSuggestionsFromTransactions");

        const suggestionResult = await generateReserveSuggestionsFromTransactions(
          {
            ownerId: getScopedUserId(ctx),
            transactions: syncResult.importedTransactions,
          }
        );

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

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to sync transactions",
        });
      }
    }),

  /**
   * Get sync status for a bank account.
   */
  getSyncStatus: protectedProcedure
    .input(
      z.object({
        bankAccountId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const account = await getBankAccountById(input.bankAccountId);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

      if (Number(account.userId) !== Number(getScopedUserId(ctx))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      const cursor = (account as any).plaidSyncCursor ?? (account as any).plaidCursor ?? null;

      return {
        hasCursor: !!cursor,
        cursor,
      };
    }),

  /**
   * Get all linked bank accounts for the current user.
   */
  getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    console.log("[Plaid] getBankAccounts for userId:", getScopedUserId(ctx));

    const accounts = await getBankAccountsByUserId(getScopedUserId(ctx));

    console.log("[Plaid] getBankAccounts result:", { count: accounts.length });

    return accounts;
  }),

  /**
   * Remove a bank account link.
   */
  removeBankAccount: protectedProcedure
    .input(z.object({ bankAccountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[Plaid] removeBankAccount input:", {
          bankAccountId: input.bankAccountId,
          userId: getScopedUserId(ctx),
        });

        const account = await getBankAccountById(input.bankAccountId);

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bank account not found",
          });
        }

        if (Number(account.userId) !== Number(getScopedUserId(ctx))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized: account does not belong to user",
          });
        }

        await deactivateBankAccount(input.bankAccountId);

        console.log("[Plaid] removeBankAccount SUCCESS");

        return { success: true };
      } catch (err) {
        console.error("[Plaid] removeBankAccount error:", err);

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to remove bank account",
        });
      }
    }),
});
