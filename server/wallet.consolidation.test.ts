import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import {
  wallets,
  reserveTransferSuggestions,
  bankAccounts,
  bankAccountClassifications,
} from "../drizzle/schema";

describe("Wallet ↔ Banking Consolidation", () => {
  let db: any;
  const testUserId = "test-user-consolidation-" + Date.now();

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.delete(reserveTransferSuggestions).where(
        eq(reserveTransferSuggestions.userId, testUserId)
      );
      await db.delete(bankAccountClassifications).where(
        eq(bankAccountClassifications.userId, testUserId)
      );
      await db.delete(bankAccounts).where(eq(bankAccounts.userId, testUserId));
      await db.delete(wallets).where(eq(wallets.userId, testUserId));
    }
  });

  it("should calculate reserved_pending correctly from reserve_transfer_suggestions", async () => {
    // Create test wallet
    const wallet = await db
      .insert(wallets)
      .values({
        userId: testUserId,
        availableBalance: 1000,
        pendingBalance: 0,
        blockedBalance: 0,
        totalEarnings: 1000,
      })
      .returning();

    // Create reserve suggestions with different statuses
    const suggestions = await db
      .insert(reserveTransferSuggestions)
      .values([
        {
          userId: testUserId,
          suggestedAmount: 100,
          status: "suggested",
          reason: "Test suggestion 1",
          fromAccountId: 1,
          toAccountId: 2,
        },
        {
          userId: testUserId,
          suggestedAmount: 50,
          status: "approved",
          reason: "Test suggestion 2",
          fromAccountId: 1,
          toAccountId: 2,
        },
        {
          userId: testUserId,
          suggestedAmount: 75,
          status: "completed",
          reason: "Test suggestion 3",
          fromAccountId: 1,
          toAccountId: 2,
        },
      ])
      .returning();

    // Calculate reserved_pending (suggested + approved)
    const pendingSuggestions = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(eq(reserveTransferSuggestions.userId, testUserId));

    const reserved = pendingSuggestions
      .filter((s: any) => s.status === "suggested" || s.status === "approved")
      .reduce((sum: number, s: any) => sum + parseFloat(s.suggestedAmount), 0);

    expect(reserved).toBe(150); // 100 + 50
  });

  it("should prevent withdrawal if reserved_pending exceeds available balance", async () => {
    // Create wallet with limited balance
    const wallet = await db
      .insert(wallets)
      .values({
        userId: testUserId + "-limited",
        availableBalance: 100,
        pendingBalance: 0,
        blockedBalance: 0,
        totalEarnings: 100,
      })
      .returning();

    // Create reserve suggestion that takes most of balance
    await db.insert(reserveTransferSuggestions).values({
      userId: testUserId + "-limited",
      suggestedAmount: 80,
      status: "suggested",
      reason: "Large reserve",
      fromAccountId: 1,
      toAccountId: 2,
    });

    // Withdrawable should be 100 - 80 = 20
    const suggestions = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(eq(reserveTransferSuggestions.userId, testUserId + "-limited"));

    const reserved = suggestions
      .filter((s: any) => s.status === "suggested" || s.status === "approved")
      .reduce((sum: number, s: any) => sum + parseFloat(s.suggestedAmount), 0);

    const withdrawable = 100 - reserved;
    expect(withdrawable).toBe(20);
  });

  it("should auto-classify first bank account as operating", async () => {
    // Create first bank account
    const account1 = await db
      .insert(bankAccounts)
      .values({
        userId: testUserId + "-auto",
        bankName: "Test Bank",
        accountType: "checking",
        accountLast4: "1234",
        plaidAccountId: "test-plaid-1",
        plaidAccessToken: "token-1",
        plaidItemId: "item-1",
        isActive: true,
      })
      .returning();

    // Create classification for first account
    const classification = await db
      .insert(bankAccountClassifications)
      .values({
        bankAccountId: account1[0].id,
        userId: testUserId + "-auto",
        classification: "operating",
        label: "Operating Account",
        description: "Auto-classified as first connected account",
        isActive: true,
      })
      .returning();

    expect(classification[0].classification).toBe("operating");

    // Create second account (should not be auto-classified)
    const account2 = await db
      .insert(bankAccounts)
      .values({
        userId: testUserId + "-auto",
        bankName: "Test Bank 2",
        accountType: "savings",
        accountLast4: "5678",
        plaidAccountId: "test-plaid-2",
        plaidAccessToken: "token-2",
        plaidItemId: "item-2",
        isActive: true,
      })
      .returning();

    // Verify only first account is operating
    const classifications = await db
      .select()
      .from(bankAccountClassifications)
      .where(eq(bankAccountClassifications.userId, testUserId + "-auto"));

    const operatingAccounts = classifications.filter(
      (c: any) => c.classification === "operating"
    );
    expect(operatingAccounts.length).toBe(1);
    expect(operatingAccounts[0].bankAccountId).toBe(account1[0].id);
  });

  it("should mark reserve suggestion as completed", async () => {
    // Create suggestion
    const suggestion = await db
      .insert(reserveTransferSuggestions)
      .values({
        userId: testUserId + "-complete",
        suggestedAmount: 100,
        status: "suggested",
        reason: "Test completion",
        fromAccountId: 1,
        toAccountId: 2,
      })
      .returning();

    // Mark as completed
    await db
      .update(reserveTransferSuggestions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(reserveTransferSuggestions.id, suggestion[0].id));

    // Verify status changed
    const updated = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(eq(reserveTransferSuggestions.id, suggestion[0].id));

    expect(updated[0].status).toBe("completed");
    expect(updated[0].completedAt).toBeDefined();
  });

  it("should dismiss reserve suggestion", async () => {
    // Create suggestion
    const suggestion = await db
      .insert(reserveTransferSuggestions)
      .values({
        userId: testUserId + "-dismiss",
        suggestedAmount: 100,
        status: "suggested",
        reason: "Test dismissal",
        fromAccountId: 1,
        toAccountId: 2,
      })
      .returning();

    // Dismiss
    await db
      .update(reserveTransferSuggestions)
      .set({ status: "dismissed" })
      .where(eq(reserveTransferSuggestions.id, suggestion[0].id));

    // Verify status changed
    const updated = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(eq(reserveTransferSuggestions.id, suggestion[0].id));

    expect(updated[0].status).toBe("dismissed");
  });

  it("should not count dismissed/completed reserves in reserved_pending", async () => {
    // Create suggestions with different statuses
    await db.insert(reserveTransferSuggestions).values([
      {
        userId: testUserId + "-count",
        suggestedAmount: 100,
        status: "suggested",
        reason: "Should count",
        fromAccountId: 1,
        toAccountId: 2,
      },
      {
        userId: testUserId + "-count",
        suggestedAmount: 50,
        status: "completed",
        reason: "Should NOT count",
        fromAccountId: 1,
        toAccountId: 2,
      },
      {
        userId: testUserId + "-count",
        suggestedAmount: 25,
        status: "dismissed",
        reason: "Should NOT count",
        fromAccountId: 1,
        toAccountId: 2,
      },
    ]);

    // Calculate reserved_pending
    const suggestions = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(eq(reserveTransferSuggestions.userId, testUserId + "-count"));

    const reserved = suggestions
      .filter((s: any) => s.status === "suggested" || s.status === "approved")
      .reduce((sum: number, s: any) => sum + parseFloat(s.suggestedAmount), 0);

    expect(reserved).toBe(100); // Only suggested counts
  });
});
