import { createConnection } from 'mysql2/promise';

async function inspectData() {
  let conn;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL not set');
      process.exit(1);
    }

    const url = new URL(dbUrl);
    const host = url.hostname;
    const user = url.username;
    const password = url.password;
    const database = url.pathname.split('/')[1];

    conn = await createConnection({
      host,
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: true,
      },
    });

    console.log('=== INVOICE DATA INSPECTION ===\n');

    // Get all invoices
    const [rows] = await conn.execute(`
      SELECT 
        id,
        invoiceNumber,
        subtotal,
        tax_amount,
        total,
        status,
        createdAt
      FROM \`invoices\`
      ORDER BY id
    `);

    console.log(`Found ${rows.length} invoices:\n`);
    if (rows.length > 0) {
      rows.forEach((row, idx) => {
        console.log(`Invoice ${idx + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Number: ${row.invoiceNumber}`);
        console.log(`  Subtotal: ${row.subtotal}`);
        console.log(`  Tax Amount: ${row.tax_amount}`);
        console.log(`  Total: ${row.total}`);
        console.log(`  Status: ${row.status}`);
        console.log(`  Created: ${row.createdAt}`);
        console.log();
      });
    }

    console.log('\n=== COLUMN INFORMATION ===\n');
    const [columns] = await conn.execute(`
      DESCRIBE \`invoices\`
    `);

    console.log(`Total columns: ${columns.length}\n`);
    columns.forEach(col => {
      const nullable = col.Null === 'YES' ? 'YES' : 'NO';
      console.log(`${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${nullable.padEnd(4)} | ${col.Default || 'NULL'}`);
    });

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('\nERROR:', err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

inspectData();
