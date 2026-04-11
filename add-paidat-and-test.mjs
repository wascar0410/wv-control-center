import { createConnection } from 'mysql2/promise';

async function addPaidAtAndTest() {
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

    console.log('Adding paidAt column and testing...\n');

    // Step 1: Add paidAt column
    console.log('Step 1: Adding paidAt column...');
    try {
      await conn.execute(`
        ALTER TABLE \`invoices\`
        ADD COLUMN \`paidAt\` DATETIME NULL AFTER \`issuedAt\`
      `);
      console.log('✓ paidAt column added successfully\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ paidAt already exists\n');
      } else {
        throw err;
      }
    }

    // Step 2: Populate paidAt from paidDate
    console.log('Step 2: Populating paidAt from paidDate...');
    const [updateResult] = await conn.execute(`
      UPDATE \`invoices\`
      SET \`paidAt\` = COALESCE(\`paidAt\`, \`paidDate\`)
      WHERE \`paidAt\` IS NULL
    `);
    console.log(`✓ Updated ${updateResult.affectedRows} rows\n`);

    // Step 3: Verify
    console.log('Step 3: Verifying paidAt data...');
    const [verifyRows] = await conn.execute(`
      SELECT 
        id,
        invoiceNumber,
        paidDate,
        paidAt,
        status
      FROM \`invoices\`
    `);
    console.log(`Found ${verifyRows.length} invoices:`);
    verifyRows.forEach(row => {
      console.log(`  ID ${row.id}: paidDate=${row.paidDate}, paidAt=${row.paidAt}, status=${row.status}`);
    });

    // Step 4: Test invoicing.getAll query
    console.log('\n\nStep 4: Testing invoicing.getAll query...');
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

addPaidAtAndTest();
