import { createConnection } from 'mysql2/promise';

async function populateAndTest() {
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

    console.log('Populating payment columns...\n');

    // Step 1: Populate columns
    console.log('Step 1: Populating paidAmount and remainingBalance...');
    const [updateResult] = await conn.execute(`
      UPDATE \`invoices\`
      SET
        \`paidAmount\` = CASE
          WHEN \`status\` = 'paid' THEN COALESCE(\`total\`, 0)
          ELSE 0
        END,
        \`remainingBalance\` = CASE
          WHEN \`status\` = 'paid' THEN 0
          ELSE COALESCE(\`total\`, 0)
        END
      WHERE \`paidAmount\` = 0 OR \`remainingBalance\` = 0 OR \`paidAmount\` IS NULL OR \`remainingBalance\` IS NULL
    `);
    console.log(`✓ Updated ${updateResult.affectedRows} rows\n`);

    // Step 2: Verify population
    console.log('Step 2: Verifying data...');
    const [verifyRows] = await conn.execute(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN \`paidAmount\` > 0 THEN 1 END) as invoices_with_payment,
        COUNT(CASE WHEN \`remainingBalance\` > 0 THEN 1 END) as invoices_with_balance,
        SUM(\`paidAmount\`) as total_paid,
        SUM(\`remainingBalance\`) as total_balance
      FROM \`invoices\`
    `);
    console.log('Verification Results:');
    console.log(JSON.stringify(verifyRows[0], null, 2));

    // Step 3: Test invoicing.getAll query
    console.log('\n\nStep 3: Testing invoicing.getAll query...');
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

populateAndTest();
