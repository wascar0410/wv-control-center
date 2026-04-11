import { createConnection } from 'mysql2/promise';

async function validateAndInventory() {
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

    console.log('=== VALIDATION & INVENTORY ===\n');

    // Part 1: Validate invoicing.getAll works
    console.log('Part 1: Validating invoicing.getAll endpoint...\n');
    
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
    `;

    try {
      const [rows] = await conn.execute(query);
      console.log('✅ invoicing.getAll FUNCTIONAL');
      console.log(`   Returned ${rows.length} invoices\n`);
    } catch (err) {
      console.log('❌ invoicing.getAll FAILED');
      console.log(`   Error: ${err.message}\n`);
      throw err;
    }

    // Part 2: Inventory of actual vs expected columns
    console.log('Part 2: Inventory of columns (Actual DB vs Drizzle Expected)\n');

    const [actualColumns] = await conn.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'invoices'
      ORDER BY ORDINAL_POSITION
    `);

    // Expected columns from Drizzle schema
    const expectedColumns = [
      'id', 'loadId', 'invoiceNumber', 'issueDate', 'dueDate',
      'brokerName', 'brokerId', 'subtotal', 'tax_rate', 'tax_amount',
      'total', 'paidAmount', 'remainingBalance', 'status', 'issuedAt',
      'paidAt', 'overdueAt', 'notes', 'terms', 'createdBy',
      'createdAt', 'updatedAt'
    ];

    const actualColumnNames = actualColumns.map(c => c.COLUMN_NAME);

    console.log('EXPECTED (Drizzle):');
    expectedColumns.forEach(col => {
      const exists = actualColumnNames.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    console.log('\nLEGACY/EXTRA (in DB but not in Drizzle):');
    const legacyColumns = actualColumnNames.filter(col => !expectedColumns.includes(col));
    if (legacyColumns.length === 0) {
      console.log('  (none)');
    } else {
      legacyColumns.forEach(col => {
        const colInfo = actualColumns.find(c => c.COLUMN_NAME === col);
        console.log(`  ⚠️  ${col} (${colInfo.COLUMN_TYPE})`);
      });
    }

    // Part 3: Detailed legacy column analysis
    console.log('\n\nPart 3: Legacy Column Analysis\n');

    if (legacyColumns.length > 0) {
      console.log('Legacy columns that could be cleaned up:\n');
      
      const legacyAnalysis = [
        {
          name: 'driverId',
          purpose: 'Old reference to driver (now use assignedDriverId in loads)',
          recommendation: 'Can be deprecated after migration'
        },
        {
          name: 'amount',
          purpose: 'Old invoice total (replaced by total)',
          recommendation: 'Can be deprecated after migration'
        },
        {
          name: 'issuedDate',
          purpose: 'Old timestamp (replaced by issueDate)',
          recommendation: 'Can be deprecated after migration'
        },
        {
          name: 'paidDate',
          purpose: 'Old payment date (replaced by paidAt)',
          recommendation: 'Can be deprecated after migration'
        },
        {
          name: 'taxAmount',
          purpose: 'Old tax amount (replaced by tax_amount)',
          recommendation: 'Can be deprecated after migration'
        }
      ];

      legacyAnalysis.forEach(item => {
        if (legacyColumns.includes(item.name)) {
          console.log(`${item.name}:`);
          console.log(`  Purpose: ${item.purpose}`);
          console.log(`  Recommendation: ${item.recommendation}\n`);
        }
      });
    }

    // Part 4: Summary
    console.log('\nPart 4: Summary\n');
    console.log(`Total columns in DB: ${actualColumnNames.length}`);
    console.log(`Expected columns: ${expectedColumns.length}`);
    console.log(`Legacy/Extra columns: ${legacyColumns.length}`);
    console.log(`\nStatus: ✅ invoicing.getAll is FUNCTIONAL`);
    console.log(`Deferred cleanup: ${legacyColumns.length} legacy columns can be cleaned up later`);

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

validateAndInventory();
