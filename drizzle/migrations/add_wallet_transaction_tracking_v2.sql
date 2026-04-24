-- Add reserve transfer tracking columns to wallet_transactions
-- Only add if they don't already exist

ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS reserveSuggestionId INT;

ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS externalTransactionId VARCHAR(255);

-- Add foreign key if not exists (check manually if needed)
-- ALTER TABLE wallet_transactions ADD FOREIGN KEY (reserveSuggestionId) REFERENCES reserve_transfer_suggestions(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS wallet_transactions_reserve_suggestion_idx ON wallet_transactions(reserveSuggestionId);
CREATE INDEX IF NOT EXISTS wallet_transactions_external_tx_idx ON wallet_transactions(externalTransactionId);
