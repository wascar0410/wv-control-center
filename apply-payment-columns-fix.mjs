import { createConnection } from 'mysql2/promise';

async function applyPaymentColumnsFix() {
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

    console.log('Applying payment columns fix...\n');

    // Step 1: Add columns
    console.log('Step 1: Adding paidAmount and remainingBalance columns...');
    try {
      await conn.execute(`
        ALTER TABLE \`invoices\`
        ADD COLUMN \`paidAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER \`total\`,
        ADD COLUMN \`remainingBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER \`paidAmount\`
      `);
      console.log('✓ Columns added successfully\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ Columns already exist (ER_DUP_FIELDNAME)\n');
      } else {
        throw err;
      }
    }

    // Step 2: Populate columns
    console.log('Step 2: Populating paidAmount and remainingBalance...');
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

    // Step 3: Verify
    console.log('Step 3: Verifying data...');
    const [rows] = await conn.execute(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN \`paidAmount\` > 0 THEN 1 END) as invoices_with_payment,
        COUNT(CASE WHEN \`remainingBalance\` > 0 THEN 1 END) as invoices_with_balance,
        SUM(\`paidAmount\`) as total_paid,
        SUM(\`remainingBalance\`) as total_balance
      FROM \`invoices\`
    `);
    console.log('Verification Results:');
    console.log(JSON.stringify(rows[0], null, 2));

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

applyPaymentColumnsFix();
