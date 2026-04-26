import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function runMigration() {
  const connection = await mysql.createConnection(connectionString);

  try {
    console.log("[Migration] Starting wallet_ledger creation...");

    // Create wallet_ledger table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS wallet_ledger (
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
    `;

    await connection.execute(createTableSQL);
    console.log("[Migration] ✅ wallet_ledger table created successfully");

    // Verify table exists
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'wallet_ledger' AND TABLE_SCHEMA = DATABASE()`
    );

    if (tables.length > 0) {
      console.log("[Migration] ✅ Verified: wallet_ledger table exists");
    } else {
      console.error("[Migration] ❌ Failed to verify wallet_ledger table");
    }
  } catch (err) {
    console.error("[Migration] Error:", err.message);
    if (err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("[Migration] ℹ️ wallet_ledger table already exists");
    } else {
      throw err;
    }
  } finally {
    await connection.end();
  }
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
