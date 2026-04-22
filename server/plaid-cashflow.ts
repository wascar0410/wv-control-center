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

  // 1) Load user's cash flow rule
  const rules = await db
    .select()
    .from(cashFlowRules)
    .where(eq(cashFlowRules.ownerId, ownerId))
    .limit(1);

  const rule = rules[0];

  if (!rule) {
    console.log(`[Reserve] ABORT: No cash flow rule for ownerId=${ownerId}`);
    return {
      created: 0,
      skipped: 0,
      reason: "No cash flow rule configured",
    };
  }

  const reservePercent = toNumber(rule.reservePercent);
  const minReserveAmount = toNumber(rule.minReserveAmount);
  const maxReserveAmount = toNumber(rule.maxReserveAmount);
  console.log(`[Reserve] CashFlowRule: reservePercent=${reservePercent}%, minAmount=${minReserveAmount}, maxAmount=${maxReserveAmount}`);

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
  console.log(`[Reserve] Operating accounts: [${Array.from(operatingAccountIds).join(", ")}]`);

  if (operatingAccountIds.size === 0) {
    console.log(`[Reserve] ABORT: No operating accounts for ownerId=${ownerId}`);
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
      console.log(`[Reserve] SKIP: Invalid bankAccountId for tx ${externalTransactionId}`);
      skipped++;
      continue;
    }

    // only deposits/credits
    if (amount <= 0) {
      console.log(`[Reserve] SKIP: Non-positive amount ${amount} for account ${bankAccountId}`);
      skipped++;
      continue;
    }

    // only accounts classified as operating for this user
    if (!operatingAccountIds.has(bankAccountId)) {
      console.log(`[Reserve] SKIP: Account ${bankAccountId} not in operating list`);
      skipped++;
      continue;
    }

    console.log(`[Reserve] PROCESS: Account ${bankAccountId}, Amount ${amount}, TxId ${externalTransactionId}`);

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

    console.log(`[Reserve] CREATED: Suggestion for ${suggestedAmount} from account ${bankAccountId}`);
    created++;
  }

  console.log(`[Reserve] COMPLETE: created=${created}, skipped=${skipped}`);
  return {
    created,
    skipped,
    reservePercent,
  };
}
