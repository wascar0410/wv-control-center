import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function runMigrations() {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
  });

  console.log("📊 Running migrations...\n");

  const sql = fs.readFileSync("/tmp/apply-migrations.sql", "utf-8");
  
  try {
    await conn.query(sql);
    console.log("✅ All migrations executed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
    process.exit(1);
  }

  await conn.end();
}

runMigrations().catch(console.error);
