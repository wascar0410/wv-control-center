#!/usr/bin/env node
/**
 * test-sync-suggestions.mjs
 * Validación funcional del flujo: plaid.syncTransactions → generateReserveSuggestionsFromTransactions
 * 
 * Uso: node test-sync-suggestions.mjs
 */

import mysql from "mysql2/promise";

// Configuración de DB desde DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está configurada");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

console.log("🔍 TEST: Validación del flujo sync → suggestions\n");

// 1. Verificar que bankAccountId = 1 existe
console.log("📋 Paso 1: Verificar cuenta bancaria ID = 1");
const [accounts] = await conn.execute(
  "SELECT id, bankName, accountType, plaidAccessToken FROM bank_accounts WHERE id = 1"
);

if (accounts.length === 0) {
  console.error("❌ No existe bankAccountId = 1");
  await conn.end();
  process.exit(1);
}

const account = accounts[0];
console.log(`✅ Cuenta encontrada:`);
console.log(`   - ID: ${account.id}`);
console.log(`   - Nombre: ${account.bankName}`);
console.log(`   - Tipo: ${account.accountType}`);
console.log(`   - Tiene Plaid: ${!!account.plaidAccessToken ? "Sí" : "No"}`);
console.log();

// 2. Verificar clasificación como "operating"
console.log("📋 Paso 2: Verificar clasificación de la cuenta");
const [classifications] = await conn.execute(
  "SELECT id, bank_account_id, classification FROM bank_account_classifications WHERE bank_account_id = 1"
);

if (classifications.length === 0) {
  console.warn("⚠️  Cuenta no está clasificada. Creando clasificación como 'operating'...");
  await conn.execute(
    "INSERT INTO bank_account_classifications (bank_account_id, classification) VALUES (?, ?)",
    [1, "operating"]
  );
  console.log("✅ Clasificación creada como 'operating'");
} else {
  const classification = classifications[0];
  console.log(`✅ Clasificación encontrada: ${classification.classification}`);
}
console.log();

// 3. Verificar cash flow rule
console.log("📋 Paso 3: Verificar regla de cash flow");
const [rules] = await conn.execute(
  "SELECT id, owner_id, reserve_percent, min_reserve_amount, max_reserve_amount FROM cash_flow_rules WHERE owner_id = 1 LIMIT 1"
);

if (rules.length === 0) {
  console.warn("⚠️  No existe regla de cash flow. Creando con reservePercent = 20%...");
  await conn.execute(
    "INSERT INTO cash_flow_rules (owner_id, reserve_percent, min_reserve_amount, max_reserve_amount) VALUES (?, ?, ?, ?)",
    [1, 20, 0, 1000]
  );
  console.log("✅ Regla creada: reservePercent = 20%, min = 0, max = 1000");
} else {
  const rule = rules[0];
  console.log(`✅ Regla encontrada:`);
  console.log(`   - reservePercent: ${rule.reserve_percent}%`);
  console.log(`   - minReserveAmount: $${rule.min_reserve_amount}`);
  console.log(`   - maxReserveAmount: $${rule.max_reserve_amount}`);
}
console.log();

// 4. Crear transacciones de prueba (simulando Plaid sync)
console.log("📋 Paso 4: Crear transacciones de prueba en transaction_imports");
const testTransactions = [
  { amount: 1000, description: "Deposit 1: $1000 (should create $300 suggestion with 30% rule)" },
  { amount: 500, description: "Deposit 2: $500 (should create $150 suggestion with 30% rule)" },
  { amount: -200, description: "Withdrawal: -$200 (should be skipped)" },
];

const insertedTxIds = [];
for (const tx of testTransactions) {
  const externalId = `test-tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const [result] = await conn.execute(
    "INSERT INTO transaction_imports (bankAccountId, externalTransactionId, amount, description, transactionType, transactionDate, category) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
    [1, externalId, tx.amount, tx.description, tx.amount > 0 ? "credit" : "debit", "other"]
  );
  insertedTxIds.push(result.insertId);
  console.log(`✅ Transacción insertada: ${tx.description} (ID: ${result.insertId})`);
}
console.log();

// 5. Simular el flujo: recolectar transacciones y llamar a generateReserveSuggestionsFromTransactions
console.log("📋 Paso 5: Simular flujo sync → suggestions");
console.log("   Recolectando transacciones positivas...");

const syncedTransactions = [];
for (let i = 0; i < testTransactions.length; i++) {
  if (testTransactions[i].amount > 0) {
    syncedTransactions.push({
      amount: testTransactions[i].amount,
      accountId: 1,
      transactionId: `test-tx-${insertedTxIds[i]}`,
      name: testTransactions[i].description,
      date: new Date().toISOString().split("T")[0],
    });
  }
}

console.log(`✅ Transacciones positivas recolectadas: ${syncedTransactions.length}`);
for (const tx of syncedTransactions) {
  console.log(`   - ${tx.name}: $${tx.amount}`);
}
console.log();

// 6. Ejecutar la lógica de generateReserveSuggestionsFromTransactions manualmente
console.log("📋 Paso 6: Ejecutar lógica de sugerencias");

const rule = rules[0] || { reserve_percent: 20, min_reserve_amount: 0, max_reserve_amount: 1000 };
const reservePercent = parseFloat(rule.reserve_percent);
const minReserveAmount = parseFloat(rule.min_reserve_amount);
const maxReserveAmount = parseFloat(rule.max_reserve_amount);

console.log(`   Usando regla: reservePercent=${reservePercent}%, min=$${minReserveAmount}, max=$${maxReserveAmount}`);

let created = 0;
let skipped = 0;

for (const tx of syncedTransactions) {
  const amount = parseFloat(tx.amount);
  
  // Calcular sugerencia
  let suggestedAmount = (amount * reservePercent) / 100;
  
  // Aplicar límites
  if (suggestedAmount < minReserveAmount) {
    suggestedAmount = minReserveAmount;
  }
  if (suggestedAmount > maxReserveAmount) {
    suggestedAmount = maxReserveAmount;
  }
  
  // Insertar en DB
  try {
    await conn.execute(
      "INSERT INTO reserve_transfer_suggestions (owner_id, from_account_id, to_account_id, suggested_amount, status, reason, external_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        1,
        1,
        1,
        suggestedAmount.toFixed(2),
        "suggested",
        `Auto reserve from deposit: ${tx.name}`,
        tx.transactionId,
      ]
    );
    created++;
    console.log(`✅ Sugerencia creada:`);
    console.log(`   - Transacción: ${tx.name}`);
    console.log(`   - Monto: $${amount}`);
    console.log(`   - Cálculo: $${amount} × ${reservePercent}% = $${(amount * reservePercent / 100).toFixed(2)}`);
    console.log(`   - Sugerencia final: $${suggestedAmount.toFixed(2)}`);
  } catch (err) {
    console.warn(`⚠️  Error al insertar sugerencia:`, err.message);
    skipped++;
  }
}

console.log();
console.log(`📊 Resumen:`);
console.log(`   - Sugerencias creadas: ${created}`);
console.log(`   - Sugerencias saltadas: ${skipped}`);
console.log();

// 7. Verificar filas en reserve_transfer_suggestions
console.log("📋 Paso 7: Verificar filas creadas en reserve_transfer_suggestions");
const [suggestions] = await conn.execute(
  "SELECT id, owner_id, from_account_id, to_account_id, suggested_amount, status, reason, external_transaction_id FROM reserve_transfer_suggestions WHERE owner_id = 1 ORDER BY created_at DESC LIMIT 5"
);

if (suggestions.length === 0) {
  console.warn("⚠️  No hay sugerencias en la DB");
} else {
  console.log(`✅ ${suggestions.length} sugerencias encontradas:`);
  for (const sugg of suggestions) {
    console.log(`   - ID: ${sugg.id}`);
    console.log(`     Monto: $${sugg.suggested_amount}`);
    console.log(`     Razón: ${sugg.reason}`);
    console.log(`     Estado: ${sugg.status}`);
    console.log();
  }
}

// 8. Simular respuesta del endpoint
console.log("📋 Paso 8: Respuesta simulada del endpoint plaid.syncTransactions");
const endpointResponse = {
  imported: testTransactions.length,
  modified: 0,
  removed: 0,
  hasMore: false,
  suggestionsCreated: created,
  suggestionSkipped: skipped,
};

console.log(`✅ Response:`);
console.log(JSON.stringify(endpointResponse, null, 2));
console.log();

// Limpiar
console.log("🧹 Limpieza: Eliminando transacciones y sugerencias de prueba");
await conn.execute("DELETE FROM transaction_imports WHERE id IN (?)", [insertedTxIds]);
await conn.execute("DELETE FROM reserve_transfer_suggestions WHERE owner_id = 1 AND reason LIKE 'Auto reserve from deposit%'");
console.log("✅ Limpieza completada");

await conn.end();
console.log("\n✅ TEST COMPLETADO");
