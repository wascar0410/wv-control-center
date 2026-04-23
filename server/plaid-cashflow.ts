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
  console.log(`[Reserve] START: ownerId=${ownerId}, transactionCount=${transactions.length}`);

  // 1) Load rule
  const rules = await db
    .select()
    .from(cashFlowRules)
    .where(eq(cashFlowRules.ownerId, ownerId))
    .limit(1);

  const rule = rules[0];

  if (!rule) {
    console.log(`[Reserve] ABORT: No rule`);
    return { created: 0, skipped: 0 };
  }

  const reservePercent = toNumber(rule.reservePercent);
  const minReserveAmount = toNumber(rule.minReserveAmount);
  const maxReserveAmount = toNumber(rule.maxReserveAmount);

  console.log(`[Reserve] Rule: ${reservePercent}%`);

  // 2) Operating accounts
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

  console.log(`[Reserve] Operating accounts:`, Array.from(operatingAccountIds));

  if (operatingAccountIds.size === 0) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;
  let skippedDuplicates = 0;
  let skippedNonCredit = 0;
  let skippedNonOperating = 0;

  for (const tx of transactions) {
    const amount = toNumber(tx.amount);
    const bankAccountId = Number(tx.accountId ?? tx.bankAccountId ?? 0);
    const externalTransactionId =
      tx.externalTransactionId ?? tx.transactionId ?? tx.id ?? null;

    const txType = tx.transactionType;

    // Check if non-credit
    if (txType !== "credit") {
      skippedNonCredit++;
      skipped++;
      continue;
    }

    if (amount <= 0) {
      skipped++;
      continue;
    }

    if (!operatingAccountIds.has(bankAccountId)) {
      skippedNonOperating++;
      skipped++;
      continue;
    }

    // DEDUPLICATION: Check if suggestion already exists for this transaction
    if (externalTransactionId) {
      const existingSuggestion = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(
          and(
            eq(reserveTransferSuggestions.ownerId, ownerId),
            eq(reserveTransferSuggestions.reason, `Plaid:${externalTransactionId}`)
          )
        )
        .limit(1);

      if (existingSuggestion.length > 0) {
        skippedDuplicates++;
        skipped++;
        continue;
      }
    }

    let suggestedAmount = (amount * reservePercent) / 100;

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
      reason: externalTransactionId ? `Plaid:${externalTransactionId}` : `Auto reserve`,
    });

    created++;
  }

  console.log(`[Reserve] COMPLETE: created=${created}, skipped=${skipped}, duplicates=${skippedDuplicates}, nonCredit=${skippedNonCredit}, nonOperating=${skippedNonOperating}`);

  return {
    created,
    skipped,
    skippedDuplicates,
    reservePercent,
  };
}
