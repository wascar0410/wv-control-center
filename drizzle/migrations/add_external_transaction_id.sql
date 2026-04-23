-- Add externalTransactionId column to reserve_transfer_suggestions
ALTER TABLE reserve_transfer_suggestions
ADD COLUMN external_transaction_id VARCHAR(255) NULL;

-- Create index for deduplication
CREATE INDEX idx_reserve_suggestions_external_tx
ON reserve_transfer_suggestions (owner_id, external_transaction_id);
