import { createConnection } from 'mysql2/promise';

async function addColumnsStepByStep() {
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

    console.log('Adding columns step by step...\n');

    // Step 1: Add paidAmount
    console.log('Step 1: Adding paidAmount column...');
    try {
      await conn.execute(`
        ALTER TABLE \`invoices\`
        ADD COLUMN \`paidAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER \`total\`
      `);
      console.log('✓ paidAmount added successfully\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ paidAmount already exists\n');
      } else {
        console.error('ERROR adding paidAmount:', err.message);
        console.error('Full error:', err);
      }
    }

    // Step 2: Add remainingBalance
    console.log('Step 2: Adding remainingBalance column...');
    try {
      await conn.execute(`
        ALTER TABLE \`invoices\`
        ADD COLUMN \`remainingBalance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER \`paidAmount\`
      `);
      console.log('✓ remainingBalance added successfully\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ remainingBalance already exists\n');
      } else {
        console.error('ERROR adding remainingBalance:', err.message);
        console.error('Full error:', err);
      }
    }

    // Step 3: Check if columns exist
    console.log('Step 3: Checking if columns exist...');
    const [columns] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'invoices' AND COLUMN_NAME IN ('paidAmount', 'remainingBalance')
    `);
    console.log(`Found ${columns.length} columns`);
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}`);
    });

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Connection error:', err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

addColumnsStepByStep();
