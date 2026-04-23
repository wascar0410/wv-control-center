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

function emptyResult(): SyncResult {
  return {
    importedTransactions: [],
    imported: 0,
    modified: 0,
    removed: 0,
    hasMore: false,
  };
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
    console.log(
      "[Plaid Sync] No bank accounts matched user/item",
      JSON.stringify({ userId, itemId })
    );
    return emptyResult();
  }

  const firstAccount: any = validAccounts[0];
  const accessToken =
    firstAccount.plaidAccessToken ??
    firstAccount.accessToken ??
    firstAccount.plaid_access_token;

  if (!accessToken) {
    throw new Error(
      `[Plaid Sync] Missing access token for item ${itemId} / user ${userId}`
    );
  }

  let cursor =
    firstAccount.plaidSyncCursor ??
    firstAccount.syncCursor ??
    firstAccount.plaid_sync_cursor ??
    null;

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
    const changed = data.modified || [];
    const deleted = data.removed || [];

    console.log(
      `[Sync] Batch: added=${added.length}, modified=${changed.length}, removed=${deleted.length}, hasMore=${Boolean(data.has_more)}`
    );

    console.log(
      "[Sync DEBUG] Plaid account_ids in batch:",
      added.map((t: any) => t.account_id)
    );

    for (const tx of added) {
      let localBankAccountId = accountIdMap.get(String(tx.account_id));

      // fallback útil si solo hay una cuenta local para ese item
      if (!localBankAccountId && validAccounts.length === 1) {
        localBankAccountId = Number(validAccounts[0].id);
        console.log(
          "[Sync FIX] Fallback account match:",
          tx.transaction_id,
          "->",
          localBankAccountId
        );
      }

      if (!localBankAccountId) {
        console.log(
          "[Plaid Sync] Skipping tx, no local bank account match",
          tx.transaction_id,
          tx.account_id
        );
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

      if (existing.length > 0) {
        continue;
      }

      // Plaid:
      // amount > 0 => expense/debit
      // amount < 0 => income/credit
      const rawAmount = Number(tx.amount ?? 0);
      const isIncome = rawAmount < 0;
      const normalizedAmount = Math.abs(rawAmount);
      const transactionType: "credit" | "debit" = isIncome ? "credit" : "debit";

      await db.insert(transactionImports).values({
        bankAccountId: localBankAccountId,
        transactionId: null,
        externalTransactionId: tx.transaction_id,
        amount: normalizedAmount,
        description: tx.name ?? "",
        transactionType,
        transactionDate: toDate(tx.date),
        category: tx.personal_finance_category?.primary
          ? String(tx.personal_finance_category.primary)
          : "other",
        isMatched: 0,
        importedAt: new Date(),
      });

      importedTransactions.push({
        accountId: localBankAccountId,
        amount: normalizedAmount,
        name: tx.name ?? "",
        date: tx.date ?? null,
        externalTransactionId: tx.transaction_id,
        transactionType,
      });

      console.log(
        `[Sync] IMPORTED: Account ${localBankAccountId}, Raw ${rawAmount}, Normalized ${normalizedAmount}, Type ${transactionType}, TxId ${tx.transaction_id}`
      );

      imported++;
    }

    modified += changed.length;
    removed += deleted.length;

    cursor = data.next_cursor ?? cursor;
    hasMore = Boolean(data.has_more);
  }

  console.log(
    `[Sync] COMPLETE: imported=${imported}, modified=${modified}, removed=${removed}, totalImportedTxs=${importedTransactions.length}`
  );

  console.log(
    "[Sync] ImportedTransactions summary:",
    importedTransactions
      .map((t) => `[Account ${t.accountId}: ${t.transactionType} ${t.amount}]`)
      .join(", ")
  );

  for (const account of validAccounts as any[]) {
    await db
      .update(bankAccounts)
      .set({
        plaidSyncCursor: cursor,
        lastSyncedAt: new Date(),
      })
      .where(eq(bankAccounts.id, account.id));
  }

  console.log("[Plaid Sync] Completed", {
    itemId,
    userId,
    imported,
    modified,
    removed,
    hasMore: false,
    cursor,
  });

  return {
    importedTransactions,
    imported,
    modified,
    removed,
    hasMore: false,
  };
}
