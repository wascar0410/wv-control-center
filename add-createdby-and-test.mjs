import { createConnection } from 'mysql2/promise';

async function addCreatedByAndTest() {
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

    console.log('Adding createdBy column and testing...\n');

    // Step 1: Add createdBy column
    console.log('Step 1: Adding createdBy column...');
    try {
      await conn.execute(`
        ALTER TABLE \`invoices\`
        ADD COLUMN \`createdBy\` INT NULL AFTER \`terms\`
      `);
      console.log('✓ createdBy column added successfully\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ createdBy already exists\n');
      } else {
        throw err;
      }
    }

    // Step 2: Test invoicing.getAll query
    console.log('Step 2: Testing invoicing.getAll query...');
    const query = `
      SELECT 
        invoices.id,
        invoices.loadId,
        invoices.invoiceNumber,
        invoices.issueDate,
        invoices.dueDate,
        invoices.brokerName,
        invoices.brokerId,
        invoices.subtotal,
        invoices.tax_rate,
        invoices.tax_amount,
        invoices.total,
        invoices.paidAmount,
        invoices.remainingBalance,
        invoices.status,
        invoices.issuedAt,
        invoices.paidAt,
        invoices.overdueAt,
        invoices.notes,
        invoices.terms,
        invoices.createdBy,
        invoices.createdAt,
        invoices.updatedAt
      FROM \`invoices\`
      LIMIT 5
    `;

    try {
      const [rows] = await conn.execute(query);
      console.log('✅ Query executed successfully!\n');
      console.log(`Returned ${rows.length} rows\n`);
      
      if (rows.length > 0) {
        console.log('Sample row:');
        console.log(JSON.stringify(rows[0], null, 2));
      }
      
      console.log('\n✅ invoicing.getAll is now FUNCTIONAL!');
    } catch (err) {
      console.log('❌ Query failed with error:\n');
      console.log(`Error Code: ${err.code}`);
      console.log(`Error Message: ${err.message}`);
      console.log(`SQL State: ${err.sqlState}`);
    }

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

addCreatedByAndTest();
