-- Create wallet_ledger table for complete accounting ledger
-- Immutable record of every balance change for audit and reconciliation

CREATE TABLE wallet_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  walletId INT NOT NULL,
  type ENUM('income', 'reserve_move', 'withdrawal', 'adjustment', 'fee', 'bonus', 'reversal') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  direction ENUM('debit', 'credit') NOT NULL,
  balanceAfter DECIMAL(12, 2) NOT NULL,
  referenceType VARCHAR(50),
  referenceId INT,
  description TEXT,
  createdBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  CONSTRAINT fk_wallet_ledger_wallet FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE CASCADE,
  CONSTRAINT fk_wallet_ledger_user FOREIGN KEY (createdBy) REFERENCES users(id),
  
  INDEX wallet_ledger_wallet_id_idx (walletId),
  INDEX wallet_ledger_type_idx (type),
  INDEX wallet_ledger_created_at_idx (createdAt)
);

-- Verify table creation
SELECT TABLE_NAME, ENGINE, TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'wallet_ledger' AND TABLE_SCHEMA = DATABASE();
