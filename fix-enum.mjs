#!/usr/bin/env node

import { getDb } from "./server/db.js";

async function fixEnum() {
  try {
    console.log("[FIX ENUM] Conectando a DB...");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    console.log("[FIX ENUM] Ejecutando ALTER TABLE...");
    const result = await db.execute(`
      ALTER TABLE reserve_transfer_suggestions
      MODIFY COLUMN status ENUM(
        'suggested',
        'approved',
        'processing',
        'pending',
        'completed',
        'dismissed',
        'failed',
        'cancelled'
      ) NOT NULL DEFAULT 'suggested'
    `);
    console.log("[FIX ENUM] ALTER TABLE completado:", result);

    console.log("[FIX ENUM] Verificando cambios...");
    const [verifyResult] = await db.execute(
      "SHOW COLUMNS FROM reserve_transfer_suggestions LIKE 'status'"
    );
    console.log("[FIX ENUM] Status column después del cambio:");
    console.log(JSON.stringify(verifyResult, null, 2));

    console.log("[FIX ENUM] ✅ Migración completada exitosamente");
    process.exit(0);
  } catch (err) {
    console.error("[FIX ENUM] ❌ Error:", err.message);
    console.error("[FIX ENUM] Stack:", err.stack);
    process.exit(1);
  }
}

fixEnum();
