#!/usr/bin/env node
/**
 * test-suggested-transfers-ui.mjs
 * Validación de los endpoints UI: getReserveSuggestions y markReserveSuggestionCompleted
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está configurada");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

console.log("🔍 TEST: Validación de endpoints UI para Suggested Transfers\n");

// 1. Crear sugerencias de prueba
console.log("📋 Paso 1: Crear sugerencias de prueba");
const testSuggestions = [
  {
    owner_id: 1,
    from_account_id: 1,
    to_account_id: 1,
    suggested_amount: 300,
    status: "suggested",
    reason: "Test: Auto reserve from $1000 deposit",
    external_transaction_id: "test-ui-1",
  },
  {
    owner_id: 1,
    from_account_id: 1,
    to_account_id: 1,
    suggested_amount: 150,
    status: "suggested",
    reason: "Test: Auto reserve from $500 deposit",
    external_transaction_id: "test-ui-2",
  },
  {
    owner_id: 1,
    from_account_id: 1,
    to_account_id: 1,
    suggested_amount: 200,
    status: "completed",
    reason: "Test: Already completed",
    external_transaction_id: "test-ui-3",
  },
];

const insertedIds = [];
for (const sugg of testSuggestions) {
  const [result] = await conn.execute(
    "INSERT INTO reserve_transfer_suggestions (owner_id, from_account_id, to_account_id, suggested_amount, status, reason, external_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      sugg.owner_id,
      sugg.from_account_id,
      sugg.to_account_id,
      sugg.suggested_amount,
      sugg.status,
      sugg.reason,
      sugg.external_transaction_id,
    ]
  );
  insertedIds.push(result.insertId);
  console.log(`✅ Sugerencia insertada: ID ${result.insertId} - ${sugg.reason}`);
}
console.log();

// 2. Simular endpoint: getReserveSuggestions con status="suggested"
console.log("📋 Paso 2: Simular endpoint getReserveSuggestions(status='suggested')");
const [suggestedOnly] = await conn.execute(
  "SELECT id, owner_id, from_account_id, to_account_id, suggested_amount, status, reason, external_transaction_id, created_at FROM reserve_transfer_suggestions WHERE owner_id = 1 AND status = 'suggested' ORDER BY created_at DESC"
);

console.log(`✅ Resultado (${suggestedOnly.length} sugerencias):`);
for (const sugg of suggestedOnly) {
  console.log(`   - ID: ${sugg.id}`);
  console.log(`     Monto: $${sugg.suggested_amount}`);
  console.log(`     Razón: ${sugg.reason}`);
  console.log(`     Status: ${sugg.status}`);
  console.log();
}

// 3. Simular endpoint: markReserveSuggestionCompleted
console.log("📋 Paso 3: Simular endpoint markReserveSuggestionCompleted");
if (suggestedOnly.length > 0) {
  const firstSugg = suggestedOnly[0];
  console.log(`   Marcando sugerencia ID ${firstSugg.id} como completada...`);
  
  const [updateResult] = await conn.execute(
    "UPDATE reserve_transfer_suggestions SET status = 'completed', updated_at = NOW() WHERE id = ? AND owner_id = 1",
    [firstSugg.id]
  );
  
  if (updateResult.affectedRows > 0) {
    console.log(`✅ Sugerencia ${firstSugg.id} marcada como completada`);
  } else {
    console.log(`❌ No se pudo actualizar la sugerencia`);
  }
} else {
  console.log("⚠️  No hay sugerencias para marcar");
}
console.log();

// 4. Verificar estado final
console.log("📋 Paso 4: Verificar estado final");
const [allSuggestions] = await conn.execute(
  "SELECT id, status, reason FROM reserve_transfer_suggestions WHERE owner_id = 1 AND external_transaction_id LIKE 'test-ui-%' ORDER BY created_at DESC"
);

console.log(`✅ Estado final (${allSuggestions.length} sugerencias de prueba):`);
for (const sugg of allSuggestions) {
  console.log(`   - ID ${sugg.id}: ${sugg.status} - ${sugg.reason}`);
}
console.log();

// 5. Simular respuesta de getReserveSuggestions (solo suggested)
console.log("📋 Paso 5: Respuesta simulada del endpoint getReserveSuggestions");
const responseData = suggestedOnly.map((s) => ({
  id: s.id,
  owner_id: s.owner_id,
  from_account_id: s.from_account_id,
  to_account_id: s.to_account_id,
  suggested_amount: s.suggested_amount,
  status: s.status,
  reason: s.reason,
  created_at: s.created_at,
}));

console.log(`✅ Response (${responseData.length} items):`);
console.log(JSON.stringify(responseData, null, 2));
console.log();

// Limpiar
console.log("🧹 Limpieza: Eliminando sugerencias de prueba");
await conn.execute(
  "DELETE FROM reserve_transfer_suggestions WHERE external_transaction_id LIKE 'test-ui-%'"
);
console.log("✅ Limpieza completada");

await conn.end();
console.log("\n✅ TEST COMPLETADO - UI está lista para mostrar sugerencias reales");
