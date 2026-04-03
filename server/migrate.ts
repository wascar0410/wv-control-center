/**
 * Database migration runner
 * Runs all pending Drizzle migrations against the production database.
 * Called during the build phase: `pnpm migrate`
 * This avoids running drizzle-kit (which tries to write files) at runtime.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[Migrate] DATABASE_URL not set — skipping migrations");
    process.exit(0);
  }

  console.log("[Migrate] Connecting to database...");
  const connection = await mysql.createConnection({
    uri: url,
    ssl: { rejectUnauthorized: true },
  });

  const db = drizzle(connection);
  const migrationsFolder = path.resolve(__dirname, "../drizzle");

  console.log("[Migrate] Running migrations from:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("[Migrate] All migrations applied successfully.");

  await connection.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("[Migrate] Migration failed:", err);
  process.exit(1);
});
