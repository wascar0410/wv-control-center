#!/usr/bin/env node

/**
 * Validación de flujo de datos en Railway:
 * 1. Verificar transacciones importadas
 * 2. Verificar sugerencias de reserva generadas
 * 3. Confirmar que sync → suggestions funciona
 */

import mysql from "mysql2/promise";

const config = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

async function main() {
  const conn = await mysql.createConnection(config);

  try {
    console.log("\n=== VALIDACIÓN DE FLUJO EN RAILWAY ===\n");

    // 1. Verificar transacciones importadas
    console.log("1. TRANSACCIONES IMPORTADAS:");
    const [transactions] = await conn.query(
      `SELECT id, bank_account_id, amount, type, description, created_at 
       FROM transaction_imports 
       WHERE bank_account_id = 1 
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    console.log(`   Total: ${transactions.length}`);
    if (transactions.length > 0) {
      transactions.forEach((t) => {
        console.log(
          `   - ID ${t.id}: ${t.type} $${t.amount} (${t.description})`
        );
      });
    } else {
      console.log("   ⚠️  No hay transacciones importadas para account 1");
    }

    // 2. Verificar clasificación de cuenta
    console.log("\n2. CLASIFICACIÓN DE CUENTA:");
    const [classification] = await conn.query(
      `SELECT id, bank_account_id, classification, created_at 
       FROM bank_account_classifications 
       WHERE bank_account_id = 1`
    );
    if (classification.length > 0) {
      console.log(
        `   ✅ Cuenta 1 clasificada como: ${classification[0].classification}`
      );
    } else {
      console.log("   ❌ Cuenta 1 no tiene clasificación");
    }

    // 3. Verificar regla de cash flow
    console.log("\n3. REGLA DE CASH FLOW:");
    const [rule] = await conn.query(
      `SELECT id, owner_id, reserve_percent, min_reserve_amount, max_reserve_amount 
       FROM cash_flow_rules 
       WHERE owner_id = 1`
    );
    if (rule.length > 0) {
      console.log(`   ✅ Regla activa:`);
      console.log(`      - Reserve %: ${rule[0].reserve_percent}%`);
      console.log(`      - Min: $${rule[0].min_reserve_amount}`);
      console.log(`      - Max: $${rule[0].max_reserve_amount}`);
    } else {
      console.log("   ❌ No hay regla de cash flow para owner 1");
    }

    // 4. Verificar sugerencias de reserva
    console.log("\n4. SUGERENCIAS DE RESERVA GENERADAS:");
    const [suggestions] = await conn.query(
      `SELECT id, from_account_id, to_account_id, suggested_amount, status, reason, created_at 
       FROM reserve_transfer_suggestions 
       WHERE owner_id = 1 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    console.log(`   Total: ${suggestions.length}`);
    if (suggestions.length > 0) {
      const suggested = suggestions.filter((s) => s.status === "suggested");
      const completed = suggestions.filter((s) => s.status === "completed");
      console.log(`   - Pendientes (suggested): ${suggested.length}`);
      console.log(`   - Completadas: ${completed.length}`);
      console.log("\n   Últimas 5 sugerencias:");
      suggestions.slice(0, 5).forEach((s) => {
        console.log(
          `   - ID ${s.id}: $${s.suggested_amount} [${s.status}] - ${s.reason}`
        );
      });
    } else {
      console.log("   ⚠️  No hay sugerencias generadas");
    }

    // 5. Análisis de flujo
    console.log("\n5. ANÁLISIS DE FLUJO:");
    if (transactions.length === 0) {
      console.log("   ❌ PROBLEMA: No hay transacciones para procesar");
      console.log("      → Verificar si Plaid está devolviendo transacciones");
    } else if (classification.length === 0 || classification[0].classification !== "operating") {
      console.log("   ❌ PROBLEMA: Cuenta no está clasificada como 'operating'");
      console.log("      → generateReserveSuggestionsFromTransactions ignora cuentas no-operating");
    } else if (suggestions.length === 0) {
      console.log("   ❌ PROBLEMA: No se generaron sugerencias");
      console.log("      → Verificar si hay depósitos positivos");
      console.log("      → Verificar si generateReserveSuggestionsFromTransactions se ejecutó");
    } else {
      console.log("   ✅ FLUJO COMPLETO:");
      console.log(`      - ${transactions.length} transacciones importadas`);
      console.log(`      - Cuenta clasificada como 'operating'`);
      console.log(`      - ${suggestions.length} sugerencias generadas`);
      console.log("      → sync → suggestions funciona correctamente");
    }

    console.log("\n=== FIN DE VALIDACIÓN ===\n");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await conn.end();
  }
}

main();
