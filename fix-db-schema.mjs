import mysql from "mysql2/promise";

async function fixDbSchema() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  try {
    const pool = mysql.createPool({
      uri: dbUrl,
      ssl: {
        rejectUnauthorized: true,
      },
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    const connection = await pool.getConnection();

    console.log("🔧 Fixing DB schema mismatch...\n");

    // 1. Add reservedBalance to wallets
    console.log("[1/6] Adding reservedBalance to wallets...");
    try {
      await connection.execute(
        "ALTER TABLE wallets ADD COLUMN reservedBalance DECIMAL(12,2) NOT NULL DEFAULT 0.00"
      );
      console.log("✅ reservedBalance added to wallets\n");
    } catch (err) {
      if (err.message.includes("Duplicate column")) {
        console.log("⚠️ reservedBalance already exists in wallets\n");
      } else {
        throw err;
      }
    }

    // 2. Add reserveSuggestionId to wallet_transactions
    console.log("[2/6] Adding reserveSuggestionId to wallet_transactions...");
    try {
      await connection.execute(
        "ALTER TABLE wallet_transactions ADD COLUMN reserveSuggestionId INT NULL"
      );
      console.log("✅ reserveSuggestionId added to wallet_transactions\n");
    } catch (err) {
      if (err.message.includes("Duplicate column")) {
        console.log("⚠️ reserveSuggestionId already exists in wallet_transactions\n");
      } else {
        throw err;
      }
    }

    // 3. Add externalTransactionId to wallet_transactions
    console.log("[3/6] Adding externalTransactionId to wallet_transactions...");
    try {
      await connection.execute(
        "ALTER TABLE wallet_transactions ADD COLUMN externalTransactionId VARCHAR(255) NULL"
      );
      console.log("✅ externalTransactionId added to wallet_transactions\n");
    } catch (err) {
      if (err.message.includes("Duplicate column")) {
        console.log("⚠️ externalTransactionId already exists in wallet_transactions\n");
      } else {
        throw err;
      }
    }

    // 4. Verify reservedBalance
    console.log("[4/6] Verifying reservedBalance in wallets...");
    const [walletCols] = await connection.execute(
      "SHOW COLUMNS FROM wallets LIKE 'reservedBalance'"
    );
    if (walletCols.length > 0) {
      console.log("✅ reservedBalance verified:", walletCols[0]);
    } else {
      console.warn("⚠️ reservedBalance NOT found in wallets");
    }
    console.log();

    // 5. Verify reserveSuggestionId
    console.log("[5/6] Verifying reserveSuggestionId in wallet_transactions...");
    const [txCols1] = await connection.execute(
      "SHOW COLUMNS FROM wallet_transactions LIKE 'reserveSuggestionId'"
    );
    if (txCols1.length > 0) {
      console.log("✅ reserveSuggestionId verified:", txCols1[0]);
    } else {
      console.warn("⚠️ reserveSuggestionId NOT found in wallet_transactions");
    }
    console.log();

    // 6. Verify externalTransactionId
    console.log("[6/6] Verifying externalTransactionId in wallet_transactions...");
    const [txCols2] = await connection.execute(
      "SHOW COLUMNS FROM wallet_transactions LIKE 'externalTransactionId'"
    );
    if (txCols2.length > 0) {
      console.log("✅ externalTransactionId verified:", txCols2[0]);
    } else {
      console.warn("⚠️ externalTransactionId NOT found in wallet_transactions");
    }
    console.log();

    await connection.release();
    await pool.end();

    console.log("✅ DB schema fix completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ DB schema fix failed:", err.message);
    process.exit(1);
  }
}

fixDbSchema();
