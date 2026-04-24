-- Add reserve transfer tracking columns to wallet_transactions
ALTER TABLE wallet_transactions
ADD COLUMN reserveSuggestionId INT AFTER withdrawalId,
ADD COLUMN externalTransactionId VARCHAR(255) AFTER reserveSuggestionId,
ADD FOREIGN KEY (reserveSuggestionId) REFERENCES reserve_transfer_suggestions(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX wallet_transactions_reserve_suggestion_idx ON wallet_transactions(reserveSuggestionId);
CREATE INDEX wallet_transactions_external_tx_idx ON wallet_transactions(externalTransactionId);
