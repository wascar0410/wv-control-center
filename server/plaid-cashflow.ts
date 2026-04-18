// server/plaid-cashflow.ts

import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  bankAccountClassifications,
  cashFlowRules,
  reserveTransferSuggestions,
} from "../drizzle/schema";

type SyncedTransaction = {
  id?: string;
  transactionId?: string;
  accountId?: number | string;
  amount: number | string;
  name?: string | null;
  date?: string | null;
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

  // 1) load rule
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

  // 2) load operating classifications
  const classifications = await db
    .select()
    .from(bankAccountClassifications)
    .where(eq(bankAccountClassifications.classification, "operating"));

  const operatingAccountIds = new Set(
    classifications.map((c) => Number(c.bankAccountId))
  );

  if (operatingAccountIds.size === 0) {
    return {
      created: 0,
      skipped: 0,
      reason: "No operating accounts classified",
    };
  }

  let created = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const amount = toNumber(tx.amount);
    const bankAccountId = Number(tx.accountId);
    const externalTransactionId = tx.transactionId || tx.id || null;

    // only deposits/credits
    if (amount <= 0) {
      skipped++;
      continue;
    }

    // only operating accounts
    if (!operatingAccountIds.has(bankAccountId)) {
      skipped++;
      continue;
    }

    // duplicate protection
    if (externalTransactionId) {
      const existing = await db
        .select()
        .from(reserveTransferSuggestions)
        .where(
          and(
            eq(reserveTransferSuggestions.ownerId, ownerId),
            eq(reserveTransferSuggestions.transactionId, Number(externalTransactionId))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }
    }

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
      transactionId: externalTransactionId ? Number(externalTransactionId) : null,
    });

    created++;
  }

  return {
    created,
    skipped,
    reservePercent,
  };
}
