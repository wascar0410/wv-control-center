import mysql from 'mysql2/promise';
import { createConnection } from 'mysql2/promise';


async function applyFix() {
  let conn;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL not set');
      process.exit(1);
    }

    // Parse connection string
    const url = new URL(dbUrl);
    const host = url.hostname;
    const user = url.username;
    const password = url.password;
    const database = url.pathname.split('/')[1];

    console.log('Connecting to production DB...');
    console.log('Host:', host);
    console.log('Database:', database);

    conn = await createConnection({
      host,
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: true,
      },
    });

    console.log('✓ Connected\n');

    // Step 1: Add column
    console.log('Step 1: Adding total column...');
    try {
      await conn.execute(`
        ALTER TABLE \`invoices\`
        ADD COLUMN \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER \`tax_amount\`
      `);
      console.log('✓ Column added successfully\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ Column already exists (ER_DUP_FIELDNAME)');
      } else {
        throw err;
      }
    }

    // Step 2: Populate column
    console.log('Step 2: Populating total column...');
    const [updateResult] = await conn.execute(`
      UPDATE \`invoices\`
      SET \`total\` = COALESCE(\`subtotal\`, 0) + COALESCE(\`tax_amount\`, 0)
      WHERE \`total\` = 0 OR \`total\` IS NULL
    `);
    console.log(`✓ Updated ${updateResult.affectedRows} rows\n`);

    // Step 3: Verify
    console.log('Step 3: Verifying data...');
    const [rows] = await conn.execute(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN \`total\` > 0 THEN 1 END) as invoices_with_total,
        COUNT(CASE WHEN \`total\` = 0 THEN 1 END) as invoices_with_zero_total,
        MIN(\`total\`) as min_total,
        MAX(\`total\`) as max_total,
        AVG(\`total\`) as avg_total
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

applyFix();
