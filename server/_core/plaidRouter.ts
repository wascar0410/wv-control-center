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
import {
  createLinkToken as createPlaidLinkToken,
  exchangePublicToken,
  getAccounts,
} from "./plaid";

export const plaidRouter = router({
  createLinkToken: protectedProcedure
    .input(z.object({ redirectUri: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("[Plaid] createLinkToken input:", {
          redirectUri: input.redirectUri,
          clientId: process.env.PLAID_CLIENT_ID ? "***" : "MISSING",
          environment: process.env.PLAID_ENV,
          userId: ctx.user.id,
        });

        const linkToken = await createPlaidLinkToken(
          ctx.user.id,
          input.redirectUri
        );

        console.log("[Plaid] createLinkToken response:", {
          linkTokenPreview:
            typeof linkToken === "string" ? `${linkToken.slice(0, 12)}...` : "invalid",
        });

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

      console.log("[Plaid] exchangePublicToken:", { itemId, userId: ctx.user.id });

      const accounts = await getAccounts(accessToken);
      console.log("[Plaid] accounts fetched:", accounts.length);

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
          console.log("[Plaid] createBankAccount success:", {
            plaidAccountId: account.account_id,
            bankName: account.name,
            mask: account.mask,
          });
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

        const syncResult = await syncPlaidTransactionsForItem({
          userId: ctx.user.id,
          itemId: account.plaidItemId,
        });
        console.log("[Sync] syncResult:", syncResult);

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

  getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    const accounts = await getBankAccountsByUserId(ctx.user.id);

    console.log("[BankAccounts] fetched:", {
      userId: ctx.user.id,
      count: accounts.length,
      ids: accounts.map((a: any) => a.id),
    });

    return accounts;
  }),

  removeBankAccount: protectedProcedure
    .input(z.object({ bankAccountId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error("User not authenticated");
      }

      const account = await getBankAccountById(input.bankAccountId);

      if (!account) {
        throw new Error("Account not found");
      }

      if (Number(account.userId) !== Number(ctx.user.id)) {
        throw new Error("Not authorized to remove this account");
      }

      await deactivateBankAccount(input.bankAccountId);

      return { success: true };
    }),
});
