import mysql from 'mysql2/promise';

async function checkMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.query('DESCRIBE business_config');
    console.log('business_config columns:');
    rows.forEach(r => console.log(`  - ${r.Field} (${r.Type})`));
    
    const hasOwnerDraw = rows.some(r => r.Field === 'ownerDrawPercent');
    console.log(`\n✓ Migration 0037 applied: ${hasOwnerDraw ? 'YES' : 'NO'}`);
  } catch (e) {
    console.error('Error:', e.message);
  }

  await connection.end();
}

checkMigration();
