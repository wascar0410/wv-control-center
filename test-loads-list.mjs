import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import https from 'https';



dotenv.config();

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function testLoadsList() {
  let connection;
  try {
    // Parse connection string
    const url = new URL(DB_URL);
    const host = url.hostname;
    const port = url.port || 3306;
    const user = url.username;
    const password = url.password;
    const database = url.pathname.slice(1);

    console.log('Connecting to:', { host, port, user, database });

    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log('✅ Connected to DB');

    // Test 1: Get all loads
    console.log('\n--- Test 1: Get all loads ---');
    const [loads] = await connection.execute('SELECT id, status FROM loads LIMIT 5');
    console.log(`Found ${loads.length} loads`);
    console.log('Sample loads:', loads);

    if (loads.length === 0) {
      console.log('No loads found in DB');
      return;
    }

    // Test 2: Get wallet transactions for first load
    const firstLoadId = loads[0].id;
    console.log(`\n--- Test 2: Get wallet transactions for load ${firstLoadId} ---`);
    const [walletTx] = await connection.execute(
      'SELECT id, loadId, type, amount FROM walletTransactions WHERE loadId = ? LIMIT 5',
      [firstLoadId]
    );
    console.log(`Found ${walletTx.length} wallet transactions`);
    console.log('Sample transactions:', walletTx);

    // Test 3: Get load details
    console.log(`\n--- Test 3: Get load details for load ${firstLoadId} ---`);
    const [loadDetails] = await connection.execute(
      'SELECT id, miles, fuelPrice, mpg, maintenancePerMile, tolls, driverPayAmount, brokerCommission FROM loads WHERE id = ?',
      [firstLoadId]
    );
    console.log('Load details:', loadDetails[0]);

    console.log('\n✅ All tests passed - DB queries work');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testLoadsList();
