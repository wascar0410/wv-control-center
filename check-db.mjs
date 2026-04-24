import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

console.log('[DB CHECK] Verificando status column...');
const [statusResult] = await connection.query(
  "SHOW COLUMNS FROM reserve_transfer_suggestions LIKE 'status'"
);
console.log('[DB CHECK] Status column:', statusResult);

console.log('[DB CHECK] Verificando updated_at column...');
const [updatedAtResult] = await connection.query(
  "SHOW COLUMNS FROM reserve_transfer_suggestions LIKE 'updated_at'"
);
console.log('[DB CHECK] Updated_at column:', updatedAtResult);

// Si status no tiene 'dismissed', ejecutar ALTER
if (statusResult.length > 0) {
  const statusType = statusResult[0].Type;
  if (!statusType.includes('dismissed')) {
    console.log('[DB FIX] Agregando estados faltantes al enum...');
    await connection.query(`
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
    console.log('[DB FIX] Enum actualizado');
  }
}

// Si updated_at no existe, agregarlo
if (updatedAtResult.length === 0) {
  console.log('[DB FIX] Agregando updated_at column...');
  await connection.query(
    'ALTER TABLE reserve_transfer_suggestions ADD COLUMN updated_at DATETIME NULL'
  );
  console.log('[DB FIX] updated_at agregado');
}

// Verificar de nuevo
console.log('[DB VERIFY] Verificando status después de cambios...');
const [statusVerify] = await connection.query(
  "SHOW COLUMNS FROM reserve_transfer_suggestions LIKE 'status'"
);
console.log('[DB VERIFY] Status column:', statusVerify);

console.log('[DB VERIFY] Verificando updated_at después de cambios...');
const [updatedAtVerify] = await connection.query(
  "SHOW COLUMNS FROM reserve_transfer_suggestions LIKE 'updated_at'"
);
console.log('[DB VERIFY] Updated_at column:', updatedAtVerify);

await connection.end();
console.log('[DB CHECK] Completado');
