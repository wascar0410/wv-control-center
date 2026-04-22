// server/plaid-cashflow.ts

import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  bankAccounts,
  bankAccountClassifications,
  cashFlowRules,
  reserveTransferSuggestions,
} from "../drizzle/schema";

type SyncedTransaction = {
  id?: string;
  transactionId?: string | number;
  externalTransactionId?: string;
  accountId?: number | string;
  bankAccountId?: number | string;
  amount: number | string;
  name?: string | null;
  date?: string | null;
  transactionType?: "credit" | "debit" | string;
};

function toNumber(value: unknown): number {
  const n = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function generateReserveSuggestionsFromTransactions(params: {
  ownerId: number;
  transactions: SyncedTransaction[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { ownerId, transactions } = params;

  // 1) Load user's cash flow rule
  const rules = await db
    .select()
    .from(cashFlowRules)
    .where(eq(cashFlowRules.ownerId, ownerId))
    .limit(1);

  const rule = rules[0];

  if (!rule) {
    return {
      created: 0,
      skipped: 0,
      reason: "No cash flow rule configured",
    };
  }

  const reservePercent = toNumber(rule.reservePercent);
  const minReserveAmount = toNumber(rule.minReserveAmount);
  const maxReserveAmount = toNumber(rule.maxReserveAmount);

  // 2) Load only this owner's operating accounts
  const classifications = await db
    .select({
      bankAccountId: bankAccountClassifications.bankAccountId,
    })
    .from(bankAccountClassifications)
    .innerJoin(
      bankAccounts,
      eq(bankAccounts.id, bankAccountClassifications.bankAccountId)
    )
    .where(
      and(
        eq(bankAccountClassifications.classification, "operating"),
        eq(bankAccounts.userId, ownerId)
      )
    );

  const operatingAccountIds = new Set(
    classifications.map((c) => Number(c.bankAccountId))
  );

  if (operatingAccountIds.size === 0) {
    return {
      created: 0,
      skipped: 0,
      reason: "No operating accounts classified for this user",
    };
  }

  let created = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const amount = toNumber(tx.amount);

    // support either accountId or bankAccountId
    const bankAccountId = Number(tx.accountId ?? tx.bankAccountId ?? 0);

    // support all possible tx id shapes
    const externalTransactionId =
      tx.externalTransactionId ?? tx.transactionId ?? tx.id ?? null;

    // must have a valid account
    if (!bankAccountId || Number.isNaN(bankAccountId)) {
      skipped++;
      continue;
    }

    // only deposits/credits
    if (amount <= 0) {
      skipped++;
      continue;
    }

    // only accounts classified as operating for this user
    if (!operatingAccountIds.has(bankAccountId)) {
      skipped++;
      continue;
    }

    // duplicate protection: check if we already created a suggestion for this transaction
    // Note: We don't have externalTransactionId in the schema, so we skip duplicate check for now
    // In the future, we could add externalTransactionId to the schema for better duplicate detection

    let suggestedAmount = (amount * reservePercent) / 100;

    // apply min/max rule
    if (suggestedAmount < minReserveAmount) {
      suggestedAmount = minReserveAmount;
    }

    if (suggestedAmount > maxReserveAmount) {
      suggestedAmount = maxReserveAmount;
    }

    await db.insert(reserveTransferSuggestions).values({
      ownerId,
      fromAccountId: bankAccountId,
      toAccountId: rule.reserveAccountId ?? bankAccountId,
      suggestedAmount: suggestedAmount.toFixed(2) as any,
      status: "suggested",
      reason: `Auto reserve suggestion from deposit${tx.name ? `: ${tx.name}` : ""}`,
      // transactionId will be populated when the transaction is imported
    });

    created++;
  }

  return {
    created,
    skipped,
    reservePercent,
  };
}
