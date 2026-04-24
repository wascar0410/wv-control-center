import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
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

    // Read and execute migration SQL
    const migrationPath = path.join(__dirname, "drizzle/migrations/add_wallet_transaction_tracking_v2.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Split by semicolon and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const statement of statements) {
      console.log(`[Migration] Executing: ${statement.substring(0, 60)}...`);
      try {
        await connection.execute(statement);
        console.log("✅ Statement executed");
      } catch (err) {
        console.warn(`⚠️ Statement warning: ${err.message}`);
        // Continue with next statement
      }
    }

    await connection.release();
    await pool.end();

    console.log("✅ Migration completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
