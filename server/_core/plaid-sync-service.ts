import { getDb } from "../db";
import { plaidClient } from "./plaidClient"; // ajusta al nombre real
import { bankAccounts, transactionImports } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function syncPlaidTransactionsForItem(params: {
  userId: number;
  itemId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { userId, itemId } = params;

  // Busca la cuenta/item relacionado en tu tabla real
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.plaidItemId, itemId));

  if (!accounts.length) {
    console.log("[Plaid Sync] No bank accounts found for item", itemId);
    return { importedTransactions: [], imported: 0, modified: 0, removed: 0, hasMore: false };
  }

  // Aquí usa TU lógica real actual de plaid.syncTransactions
  // Esto es solo estructura:
  const importedTransactions: any[] = [];
  let imported = 0;
  let modified = 0;
  let removed = 0;
  let hasMore = false;

  // Ejemplo: por cada cuenta del item, llamar a Plaid sync y guardar en transactionImports
  for (const account of accounts) {
    // reemplaza con tu código real existente
    // const result = await plaidClient.transactionsSync(...)
    // const added = result.data.added || []

    const added: any[] = []; // <- sustituir con datos reales del sync

    for (const tx of added) {
      await db.insert(transactionImports).values({
        bankAccountId: account.id,
        transactionId: null,
        externalTransactionId: tx.transaction_id,
        amount: tx.amount,
        description: tx.name ?? "",
        transactionType: tx.amount > 0 ? "credit" : "debit",
        transactionDate: tx.date ? new Date(tx.date + "T00:00:00") : new Date(),
        category: "other",
        isMatched: 0,
        importedAt: new Date(),
      });

      importedTransactions.push({
        accountId: account.id,
        amount: tx.amount,
        name: tx.name,
        date: tx.date,
        externalTransactionId: tx.transaction_id,
        transactionType: tx.amount > 0 ? "credit" : "debit",
      });

      imported++;
    }
  }

  return {
    importedTransactions,
    imported,
    modified,
    removed,
    hasMore,
  };
}
