import mysql from 'mysql2/promise';

async function checkSchema() {
  let connection;
  try {
    // Get DB credentials from environment
    const host = process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost';
    const user = process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root';
    const password = process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '';
    const database = process.env.DATABASE_URL?.split('/').pop() || 'wv_control';

    console.log(`Connecting to ${host}/${database}...\n`);

    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
    });

    // Get DESCRIBE output
    const [rows] = await connection.execute('DESCRIBE `invoices`');
    
    console.log('=== INVOICES TABLE SCHEMA ===\n');
    console.log('Column Name | Type | Null | Key | Default | Extra');
    console.log('-'.repeat(80));
    
    rows.forEach(row => {
      console.log(
        `${row.Field.padEnd(20)} | ${row.Type.padEnd(25)} | ${row.Null.padEnd(4)} | ${(row.Key || '-').padEnd(3)} | ${(row.Default || 'NULL').padEnd(10)} | ${row.Extra || ''}`
      );
    });

    console.log('\n\n=== COLUMN EXISTENCE CHECK ===');
    const columns = rows.map(r => r.Field);
    
    console.log(`✓ 'total' exists: ${columns.includes('total')}`);
    console.log(`✓ 'tax_rate' exists: ${columns.includes('tax_rate')}`);
    console.log(`✓ 'tax_amount' exists: ${columns.includes('tax_amount')}`);
    console.log(`✓ 'taxrate' exists: ${columns.includes('taxrate')}`);
    console.log(`✓ 'taxamount' exists: ${columns.includes('taxamount')}`);
    console.log(`✓ 'subtotal' exists: ${columns.includes('subtotal')}`);
    console.log(`✓ 'paidAmount' exists: ${columns.includes('paidAmount')}`);
    console.log(`✓ 'remainingBalance' exists: ${columns.includes('remainingBalance')}`);

    console.log('\n\nAll columns:');
    columns.forEach((col, i) => {
      console.log(`${i + 1}. ${col}`);
    });

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkSchema();
