-- Add reservedBalance column to wallets table
ALTER TABLE wallets
ADD COLUMN reservedBalance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER availableBalance;

-- Create index for faster queries
CREATE INDEX wallets_reserved_balance_idx ON wallets(reservedBalance);
