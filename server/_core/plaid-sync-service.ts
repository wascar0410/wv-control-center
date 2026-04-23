import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { plaidClient } from "./plaidClient";
import { bankAccounts, transactionImports } from "../../drizzle/schema";

type SyncResult = {
  importedTransactions: Array<{
    accountId: number;
    amount: number;
    name: string;
    date: string | null;
    externalTransactionId: string;
    transactionType: "credit" | "debit";
  }>;
  imported: number;
  modified: number;
  removed: number;
  hasMore: boolean;
};

function toDate(value?: string | null) {
  if (!value) return new Date();
  return new Date(`${value}T00:00:00`);
}

export async function syncPlaidTransactionsForItem(params: {
  userId: number;
  itemId: string;
}): Promise<SyncResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { userId, itemId } = params;
  console.log(`[Sync] START: userId=${userId}, itemId=${itemId}`);

  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.plaidItemId, itemId));

  if (!accounts.length) {
    console.log("[Plaid Sync] No bank accounts found for item", itemId);
    return emptyResult();
  }

  const validAccounts = accounts.filter(
    (a: any) => Number(a.userId) === Number(userId)
  );

  if (!validAccounts.length) {
    console.log("[Plaid Sync] No accounts matched user/item");
    return emptyResult();
  }

  const firstAccount: any = validAccounts[0];
  const accessToken = firstAccount.plaidAccessToken;

  if (!accessToken) {
    throw new Error("Missing accessToken");
  }

  let cursor = firstAccount.plaidSyncCursor ?? null;

  const accountIdMap = new Map<string, number>();

  for (const account of validAccounts as any[]) {
    if (account.plaidAccountId) {
      accountIdMap.set(String(account.plaidAccountId), Number(account.id));
    }
  }

  console.log("[Sync DEBUG] Local account map:", [...accountIdMap.entries()]);

  const importedTransactions: SyncResult["importedTransactions"] = [];
  let imported = 0;
  let modified = 0;
  let removed = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor || undefined,
      count: 100,
    });

    const data: any = response.data;
    const added = data.added || [];

    console.log("[Sync DEBUG] Plaid account_ids:", added.map((t: any) => t.account_id));

    for (const tx of added) {
      let localBankAccountId = accountIdMap.get(String(tx.account_id));

      // 🔥 FIX CRÍTICO: fallback si no hay match
      if (!localBankAccountId && validAccounts.length === 1) {
        localBankAccountId = validAccounts[0].id;
        console.log("[Sync FIX] Using fallback account:", localBankAccountId);
      }

      if (!localBankAccountId) {
        console.log("[Sync ERROR] No match for account_id:", tx.account_id);
        continue;
      }

      const existing = await db
        .select()
        .from(transactionImports)
        .where(
          and(
            eq(transactionImports.bankAccountId, localBankAccountId),
            eq(transactionImports.externalTransactionId, tx.transaction_id)
          )
        )
        .limit(1);

      if (existing.length > 0) continue;

      const amount = Number(tx.amount ?? 0);

      await db.insert(transactionImports).values({
        bankAccountId: localBankAccountId,
        transactionId: null,
        externalTransactionId: tx.transaction_id,
        amount,
        description: tx.name ?? "",
        transactionType: amount > 0 ? "expense" : "income",
        transactionDate: toDate(tx.date),
        category: "plaid",
        isMatched: 0,
        importedAt: new Date(),
      });

      imported++;
    }

    cursor = data.next_cursor ?? cursor;
    hasMore = Boolean(data.has_more);

    console.log(`[Sync] Batch: added=${added.length}, hasMore=${hasMore}`);
  }

  // guardar cursor
  for (const account of validAccounts as any[]) {
    await db
      .update(bankAccounts)
      .set({
        plaidSyncCursor: cursor,
        lastSyncedAt: new Date(),
      })
      .where(eq(bankAccounts.id, account.id));
  }

  console.log(`[Sync COMPLETE] imported=${imported}`);

  return {
    importedTransactions,
    imported,
    modified,
    removed,
    hasMore: false,
  };
}

function emptyResult(): SyncResult {
  return {
    importedTransactions: [],
    imported: 0,
    modified: 0,
    removed: 0,
    hasMore: false,
  };
}
