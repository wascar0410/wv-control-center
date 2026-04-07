import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function diagnoseDb() {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  });

  console.log("📊 Database Diagnostic Report\n");

  // Check wallet tables
  const tablesToCheck = [
    "wallets",
    "wallet_transactions",
    "withdrawals",
    "settlements",
    "settlement_loads",
    "payment_blocks",
    "invoices",
    "alerts",
    "tasks",
    "quote_analysis"
  ];

  console.log("Checking tables:");
  for (const table of tablesToCheck) {
    try {
      const [result] = await conn.execute(`SHOW TABLES LIKE '${table}'`);
      const exists = result.length > 0;
      console.log(`  ${exists ? "✓" : "✗"} ${table}`);
      
      if (exists) {
        const [cols] = await conn.execute(`DESCRIBE ${table}`);
        console.log(`    Columns: ${cols.map(c => c.Field).join(", ")}`);
      }
    } catch (err) {
      console.log(`  ✗ ${table} (error: ${err.message})`);
    }
  }

  await conn.end();
}

diagnoseDb().catch(console.error);
