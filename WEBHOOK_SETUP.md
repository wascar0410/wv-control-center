# Plaid Webhook Setup Guide

## Overview

This guide explains how to set up and configure Plaid webhooks for automatic transaction synchronization in real-time.

## What is a Plaid Webhook?

A webhook is a way for Plaid to notify your application when certain events occur, such as:

- **TRANSACTIONS_UPDATED**: New transactions are available for a connected bank account
- **ITEM_ERROR**: An error occurred with the connected account (e.g., login expired)
- **AUTH_REQUIRED**: The user needs to re-authenticate with their bank
- **WEBHOOK_UPDATE_ACKNOWLEDGED**: Plaid acknowledges your webhook configuration

## Webhook Endpoints

The application exposes two webhook endpoints:

### Primary Endpoint (Recommended)
```
POST /api/webhooks/plaid
```

Features:
- Signature verification using HMAC-SHA256
- Structured event handling
- Automatic transaction sync and reserve suggestion generation
- Error handling and logging

### Legacy Endpoint (Backward Compatible)
```
POST /api/plaid/webhook
```

Features:
- No signature verification
- Basic event handling
- Kept for backward compatibility

## Configuration

### 1. Set Webhook Secret

Add the webhook secret to your environment variables:

```bash
PLAID_WEBHOOK_SECRET=your-webhook-secret-from-plaid
```

This secret is used to verify that webhook requests actually come from Plaid.

### 2. Configure in Plaid Dashboard

1. Log in to your [Plaid Dashboard](https://dashboard.plaid.com)
2. Navigate to **Settings** → **Webhooks**
3. Set the webhook URL to:
   ```
   https://your-domain.com/api/webhooks/plaid
   ```
4. Copy the webhook secret and add it to your environment variables
5. Enable the following events:
   - TRANSACTIONS_UPDATED
   - ITEM_ERROR
   - AUTH_REQUIRED

### 3. Testing Locally

For local development, you can use a tunneling service like ngrok:

```bash
# Start ngrok tunnel
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io

# Configure in Plaid Dashboard:
# https://abc123.ngrok.io/api/webhooks/plaid
```

## How It Works

### Automatic Transaction Sync

When a user's bank account receives new transactions:

1. **Plaid detects the transactions** and sends a `TRANSACTIONS_UPDATED` webhook
2. **Your app receives the webhook** at `/api/webhooks/plaid`
3. **Signature verification** ensures the request is from Plaid
4. **Transactions are synced** automatically using `syncPlaidTransactionsForItem()`
5. **Reserve suggestions are generated** using `generateReserveSuggestionsFromTransactions()`
6. **Wallet UI updates** to show new suggestions and updated balances

### Error Handling

If an error occurs with a connected account:

1. **Plaid sends an ITEM_ERROR webhook**
2. **Your app receives and processes the error**
3. **The account is marked as inactive** if it's a critical error
4. **User is notified** to re-authenticate if needed

## Event Flow Diagram

```
Plaid Bank API
    ↓
User makes transaction
    ↓
Plaid detects change
    ↓
Plaid sends TRANSACTIONS_UPDATED webhook
    ↓
POST /api/webhooks/plaid
    ↓
Signature verification ✓
    ↓
handlePlaidWebhook()
    ↓
handleTransactionsUpdated()
    ↓
syncPlaidTransactionsForItem() → Import transactions
    ↓
generateReserveSuggestionsFromTransactions() → Create suggestions
    ↓
Database updated
    ↓
Wallet UI reflects changes
```

## Monitoring Webhooks

### Check Webhook Logs

Webhooks are logged to the server console with the `[Plaid Webhook]` prefix:

```
[Plaid Webhook] RECEIVED at 2026-04-23T00:05:00.000Z
[Plaid Webhook] Event: TRANSACTIONS/TRANSACTIONS_UPDATED
[Plaid Webhook] Starting transaction sync...
[Plaid Webhook] Sync completed: imported 5, updated 2
[Plaid Webhook] Suggestions generated: created 2, skipped 1
```

### Webhook Status in Dashboard

In the Plaid Dashboard, you can see:
- Last webhook delivery time
- Webhook delivery status (success/failure)
- Webhook event history

## Troubleshooting

### Webhooks Not Received

1. **Check webhook URL** - Ensure it's publicly accessible
2. **Check firewall** - Make sure your server accepts incoming requests
3. **Check logs** - Look for `[Plaid Webhook]` entries in your server logs
4. **Test with ngrok** - If using ngrok, ensure tunnel is active

### Signature Verification Failed

1. **Verify webhook secret** - Ensure `PLAID_WEBHOOK_SECRET` matches Plaid Dashboard
2. **Check request headers** - Look for `x-plaid-verification-header`
3. **Disable verification temporarily** (dev only) - Remove `PLAID_WEBHOOK_SECRET` to skip verification

### Transactions Not Syncing

1. **Check bank account exists** - Ensure account is in `bank_accounts` table
2. **Check access token** - Verify `plaidAccessToken` is valid
3. **Check logs** - Look for error messages in `[Plaid Webhook]` logs
4. **Manual sync** - Use `plaid.syncTransactions` endpoint as fallback

## Best Practices

1. **Always verify signatures** - Use `PLAID_WEBHOOK_SECRET` in production
2. **Return 200 quickly** - Process webhooks asynchronously if possible
3. **Implement retry logic** - Plaid will retry failed webhooks
4. **Monitor webhook health** - Check Plaid Dashboard regularly
5. **Log all events** - Keep detailed logs for debugging
6. **Test in sandbox** - Use Plaid's sandbox environment first

## API Reference

### handlePlaidWebhook(event)

Main webhook handler that routes events to appropriate handlers.

```typescript
interface PlaidWebhookEvent {
  webhook_type: string;      // "TRANSACTIONS", "ITEM", "WEBHOOK"
  webhook_code: string;       // "TRANSACTIONS_UPDATED", "ITEM_ERROR", etc.
  item_id: string;            // Plaid item ID
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
```

### verifyPlaidWebhookSignature(body, signature, secret)

Verifies webhook signature using HMAC-SHA256.

```typescript
const isValid = verifyPlaidWebhookSignature(
  rawBody,
  "x-plaid-verification-header-value",
  "webhook-secret"
);
```

## Next Steps

1. ✅ Set up webhook in Plaid Dashboard
2. ✅ Add `PLAID_WEBHOOK_SECRET` to environment
3. ✅ Test with sample transactions
4. ✅ Monitor logs to confirm sync is working
5. ✅ Verify Wallet UI updates automatically

## Support

For issues with Plaid webhooks:
- Check [Plaid Documentation](https://plaid.com/docs/api/webhooks/)
- Review server logs with `[Plaid Webhook]` prefix
- Test with Plaid's webhook testing tools in Dashboard
