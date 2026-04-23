/**
 * Plaid Webhook Handler
 * Processes real-time events from Plaid (transactions, errors, auth requirements)
 * Automatically syncs transactions and generates reserve suggestions
 */

import crypto from "crypto";
import { syncPlaidTransactionsForItem } from "./plaid-sync-service";
import { generateReserveSuggestionsFromTransactions } from "../plaid-cashflow";
import { getBankAccountById, getDb } from "../db";
import { bankAccounts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface PlaidWebhookEvent {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
    display_message: string;
  };
  new_transactions?: number;
  removed_transactions?: string[];
  timestamp?: string;
}

/**
 * Verify Plaid webhook signature
 * Plaid sends X-Plaid-Verification-Header with HMAC-SHA256 signature
 */
export function verifyPlaidWebhookSignature(
  body: string,
  signature: string | undefined,
  webhookSecret: string
): boolean {
  if (!signature) {
    console.error("[Plaid Webhook] Missing X-Plaid-Verification-Header");
    return false;
  }

  try {
    const computed = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("base64");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature)
    );

    if (!isValid) {
      console.error("[Plaid Webhook] Signature verification failed");
    }

    return isValid;
  } catch (err) {
    console.error("[Plaid Webhook] Signature verification error:", err);
    return false;
  }
}

/**
 * Process TRANSACTIONS_UPDATED event
 * Syncs new transactions and generates reserve suggestions
 */
export async function handleTransactionsUpdated(
  event: PlaidWebhookEvent
): Promise<void> {
  try {
    console.log("[Plaid Webhook] TRANSACTIONS_UPDATED:", {
      itemId: event.item_id,
      newTransactions: event.new_transactions,
    });

    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Find bank account by plaidItemId
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.plaidItemId, event.item_id));

    if (!accounts || accounts.length === 0) {
      console.warn("[Plaid Webhook] No bank account found for itemId:", event.item_id);
      return;
    }

    const account = accounts[0];
    console.log("[Plaid Webhook] Found account:", {
      accountId: account.id,
      userId: account.userId,
    });

    // Sync transactions for this item
    console.log("[Plaid Webhook] Starting transaction sync...");
    const syncResult = await syncPlaidTransactionsForItem({
      plaidItemId: event.item_id,
      accessToken: account.plaidAccessToken,
      userId: account.userId,
    });

    console.log("[Plaid Webhook] Sync completed:", {
      imported: syncResult.imported,
      updated: syncResult.updated,
    });

    // Generate reserve suggestions from new transactions
    if (syncResult.imported > 0 || syncResult.updated > 0) {
      console.log("[Plaid Webhook] Generating reserve suggestions...");
      const suggestionsResult = await generateReserveSuggestionsFromTransactions(
        account.userId
      );

      console.log("[Plaid Webhook] Suggestions generated:", {
        created: suggestionsResult.created,
        skipped: suggestionsResult.skipped,
      });
    }

    console.log("[Plaid Webhook] TRANSACTIONS_UPDATED processed successfully");
  } catch (err) {
    console.error("[Plaid Webhook] Error processing TRANSACTIONS_UPDATED:", err);
    throw err;
  }
}

/**
 * Process ITEM_ERROR event
 * Logs error and marks account as needing attention
 */
export async function handleItemError(event: PlaidWebhookEvent): Promise<void> {
  try {
    console.error("[Plaid Webhook] ITEM_ERROR:", {
      itemId: event.item_id,
      errorType: event.error?.error_type,
      errorCode: event.error?.error_code,
      errorMessage: event.error?.error_message,
    });

    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Find and update account status
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.plaidItemId, event.item_id));

    if (accounts && accounts.length > 0) {
      // Mark account as inactive if there's an error
      if (
        event.error?.error_type === "ITEM_LOGIN_REQUIRED" ||
        event.error?.error_type === "ITEM_NOT_FOUND"
      ) {
        await db
          .update(bankAccounts)
          .set({ isActive: false })
          .where(eq(bankAccounts.id, accounts[0].id));

        console.log("[Plaid Webhook] Account marked as inactive:", {
          accountId: accounts[0].id,
        });
      }
    }
  } catch (err) {
    console.error("[Plaid Webhook] Error processing ITEM_ERROR:", err);
    throw err;
  }
}

/**
 * Process AUTH_REQUIRED event
 * User needs to re-authenticate with their bank
 */
export async function handleAuthRequired(event: PlaidWebhookEvent): Promise<void> {
  try {
    console.warn("[Plaid Webhook] AUTH_REQUIRED:", {
      itemId: event.item_id,
      message: event.error?.display_message,
    });

    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Find account and mark for re-auth
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.plaidItemId, event.item_id));

    if (accounts && accounts.length > 0) {
      // In a real app, you might add a flag like needsReauth: true
      console.log("[Plaid Webhook] Account needs re-authentication:", {
        accountId: accounts[0].id,
        userId: accounts[0].userId,
      });
    }
  } catch (err) {
    console.error("[Plaid Webhook] Error processing AUTH_REQUIRED:", err);
    throw err;
  }
}

/**
 * Main webhook handler
 * Routes events to appropriate handlers
 */
export async function handlePlaidWebhook(event: PlaidWebhookEvent): Promise<void> {
  console.log("[Plaid Webhook] Received event:", {
    type: event.webhook_type,
    code: event.webhook_code,
    itemId: event.item_id,
  });

  try {
    switch (event.webhook_code) {
      case "TRANSACTIONS_UPDATED":
        await handleTransactionsUpdated(event);
        break;

      case "ITEM_ERROR":
        await handleItemError(event);
        break;

      case "AUTH_REQUIRED":
        await handleAuthRequired(event);
        break;

      case "WEBHOOK_UPDATE_ACKNOWLEDGED":
        console.log("[Plaid Webhook] Webhook acknowledged");
        break;

      default:
        console.log("[Plaid Webhook] Unhandled webhook code:", event.webhook_code);
    }
  } catch (err) {
    console.error("[Plaid Webhook] Error handling webhook:", err);
    throw err;
  }
}
