import { createConnection } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2/driver';
import * as schema from './drizzle/schema.ts';

async function checkSchema() {
  try {
    const connection = await createConnection({
      uri: process.env.DATABASE_URL,
      ssl: 'amazon',
    });

    const db = drizzle(connection, { schema });

    console.log('=== CHECKING INVOICES TABLE SCHEMA ===\n');

    // Execute raw DESCRIBE query
    const [rows] = await connection.execute('DESCRIBE `invoices`');
    
    console.log('Columns in Database:');
    console.log('─'.repeat(80));
    
    const columns = [];
    rows.forEach((row, idx) => {
      columns.push(row.Field);
      const nullable = row.Null === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.Default ? `DEFAULT ${row.Default}` : '';
      console.log(`${idx + 1}. ${row.Field.padEnd(25)} ${row.Type.padEnd(20)} ${nullable.padEnd(10)} ${defaultVal}`);
    });

    console.log('\n\n=== COLUMN EXISTENCE VERIFICATION ===');
    console.log(`✓ 'total' exists: ${columns.includes('total')}`);
    console.log(`✓ 'tax_rate' exists: ${columns.includes('tax_rate')}`);
    console.log(`✓ 'tax_amount' exists: ${columns.includes('tax_amount')}`);
    console.log(`✓ 'taxrate' exists: ${columns.includes('taxrate')}`);
    console.log(`✓ 'taxamount' exists: ${columns.includes('taxamount')}`);
    console.log(`✓ 'subtotal' exists: ${columns.includes('subtotal')}`);
    console.log(`✓ 'paidAmount' exists: ${columns.includes('paidAmount')}`);
    console.log(`✓ 'remainingBalance' exists: ${columns.includes('remainingBalance')}`);

    console.log('\n\n=== MISSING COLUMNS (Expected by Drizzle but not in DB) ===');
    const expectedColumns = [
      'id', 'loadId', 'invoiceNumber', 'issueDate', 'dueDate',
      'brokerName', 'brokerId', 'subtotal', 'tax_rate', 'tax_amount', 'total',
      'paidAmount', 'remainingBalance', 'status', 'issuedAt', 'paidAt', 'overdueAt',
      'notes', 'terms', 'createdBy', 'createdAt', 'updatedAt'
    ];

    const missing = expectedColumns.filter(col => !columns.includes(col));
    if (missing.length > 0) {
      console.log('Missing columns:');
      missing.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('All expected columns present!');
    }

    console.log('\n\n=== UNEXPECTED COLUMNS (In DB but not in Drizzle schema) ===');
    const unexpected = columns.filter(col => !expectedColumns.includes(col));
    if (unexpected.length > 0) {
      console.log('Unexpected columns:');
      unexpected.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('No unexpected columns.');
    }

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
