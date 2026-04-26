-- Add companyId column to wallets table for company-level wallet support
-- This allows separating company wallets from driver individual wallets

ALTER TABLE wallets
ADD COLUMN companyId INT DEFAULT 1 AFTER id;

-- Add index for company-level queries
CREATE INDEX wallets_company_id_idx ON wallets(companyId);

-- Verify the column was added
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'wallets' AND COLUMN_NAME = 'companyId';
