import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import { createLinkToken, exchangePublicToken, getTransactions, getAccounts } from "./plaid";
import { createBankAccount, createTransactionImport } from "../db";

export const plaidRouter = router({
  createLinkToken: protectedProcedure
    .input(z.object({ redirectUri: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const linkToken = await createLinkToken(ctx.user.id, input.redirectUri);
      return { linkToken };
    }),

  exchangeToken: protectedProcedure
    .input(z.object({ publicToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { accessToken, itemId } = await exchangePublicToken(input.publicToken);
      
      // Get account details
      const accounts = await getAccounts(accessToken);
      
      // Store each account
      for (const account of accounts) {
        await createBankAccount({
          userId: ctx.user.id,
          bankName: "Bank Account",
          accountType: (account.subtype || "other") as any,
          accountLast4: account.mask || "****",
          plaidAccountId: account.account_id,
          plaidAccessToken: accessToken,
        });
      }

      return { success: true, accountCount: accounts.length };
    }),

  syncTransactions: protectedProcedure
    .input(z.object({ 
      bankAccountId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      // This would be called by a background job or webhook
      // For now, it's a placeholder for the actual sync logic
      return { success: true, transactionsImported: 0 };
    }),
});
