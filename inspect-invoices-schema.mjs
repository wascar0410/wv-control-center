import { getDb } from './server/db.ts';

async function inspectSchema() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB connection failed');
      process.exit(1);
    }

    console.log('=== INVOICES TABLE SCHEMA ===\n');
    
    // Get DESCRIBE output
    const describeResult = await db.execute('DESCRIBE `invoices`');
    
    console.log('Columns in DB:');
    console.log(JSON.stringify(describeResult, null, 2));
    
    // Also get column names only
    const columns = describeResult.map(col => col.Field);
    console.log('\n\nColumn names (in order):');
    columns.forEach((col, i) => {
      console.log(`${i + 1}. ${col}`);
    });
    
    // Check for specific columns
    console.log('\n\n=== COLUMN EXISTENCE CHECK ===');
    console.log(`✓ 'total' exists: ${columns.includes('total')}`);
    console.log(`✓ 'tax_rate' exists: ${columns.includes('tax_rate')}`);
    console.log(`✓ 'tax_amount' exists: ${columns.includes('tax_amount')}`);
    console.log(`✓ 'taxrate' exists: ${columns.includes('taxrate')}`);
    console.log(`✓ 'taxamount' exists: ${columns.includes('taxamount')}`);
    console.log(`✓ 'subtotal' exists: ${columns.includes('subtotal')}`);
    console.log(`✓ 'paidAmount' exists: ${columns.includes('paidAmount')}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

inspectSchema();
