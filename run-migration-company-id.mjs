import mysql from "mysql2/promise";

async function addCompanyIdToWallets() {
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

    console.log("🔧 Adding companyId to wallets table...\n");

    // 1. Add companyId column
    console.log("[1/3] Adding companyId column to wallets...");
    try {
      await connection.execute(
        "ALTER TABLE wallets ADD COLUMN companyId INT DEFAULT 1 AFTER id"
      );
      console.log("✅ companyId column added\n");
    } catch (err) {
      if (err.message.includes("Duplicate column")) {
        console.log("⚠️ companyId already exists in wallets\n");
      } else {
        throw err;
      }
    }

    // 2. Add index
    console.log("[2/3] Adding index on companyId...");
    try {
      await connection.execute(
        "CREATE INDEX wallets_company_id_idx ON wallets(companyId)"
      );
      console.log("✅ Index created\n");
    } catch (err) {
      if (err.message.includes("Duplicate key name")) {
        console.log("⚠️ Index already exists\n");
      } else {
        throw err;
      }
    }

    // 3. Verify column
    console.log("[3/3] Verifying companyId column...");
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wallets' AND COLUMN_NAME = 'companyId'"
    );

    if (columns.length > 0) {
      const col = columns[0];
      console.log("✅ companyId verified:");
      console.log(`   - Type: ${col.COLUMN_TYPE}`);
      console.log(`   - Nullable: ${col.IS_NULLABLE}`);
      console.log(`   - Default: ${col.COLUMN_DEFAULT}`);
    } else {
      console.warn("⚠️ companyId NOT found in wallets");
    }
    console.log();

    await connection.release();
    await pool.end();

    console.log("✅ companyId migration completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

addCompanyIdToWallets();
