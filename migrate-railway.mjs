#!/usr/bin/env node

import mysql from 'mysql2/promise';

async function migrate() {
  let connection;
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set');
    }

    console.log('[MIGRATE] DATABASE_URL detected');
    console.log('[MIGRATE] Parsing connection string...');

    // Create connection using DATABASE_URL
    connection = await mysql.createConnection(dbUrl);
    console.log('[MIGRATE] ✅ Connected to Railway MySQL');

    // Step 1: Check current status column
    console.log('[MIGRATE] Step 1: Checking current status column...');
    const [checkResult] = await connection.query(
      "SHOW COLUMNS FROM reserve_transfer_suggestions LIKE 'status'"
    );
    console.log('[MIGRATE] Current status column:');
    console.log(JSON.stringify(checkResult, null, 2));

    // Step 2: Execute ALTER TABLE
    console.log('[MIGRATE] Step 2: Executing ALTER TABLE...');
    const alterQuery = `
      ALTER TABLE reserve_transfer_suggestions
      MODIFY COLUMN status ENUM(
        'suggested',
        'approved',
        'processing',
        'pending',
        'completed',
        'dismissed',
        'failed',
        'cancelled'
      ) NOT NULL DEFAULT 'suggested'
    `;
    
    const [alterResult] = await connection.query(alterQuery);
    console.log('[MIGRATE] ✅ ALTER TABLE executed');
    console.log('[MIGRATE] Result:', alterResult);

    // Step 3: Verify the change
    console.log('[MIGRATE] Step 3: Verifying changes...');
    const [verifyResult] = await connection.query(
      "SHOW COLUMNS FROM reserve_transfer_suggestions LIKE 'status'"
    );
    console.log('[MIGRATE] Updated status column:');
    console.log(JSON.stringify(verifyResult, null, 2));

    // Check if dismissed is in the enum
    const statusType = verifyResult[0]?.Type || '';
    if (statusType.includes('dismissed')) {
      console.log('[MIGRATE] ✅ SUCCESS: dismissed is now in the enum');
    } else {
      console.log('[MIGRATE] ❌ FAILED: dismissed is NOT in the enum');
      console.log('[MIGRATE] Type:', statusType);
    }

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE] ❌ Error:', err.message);
    console.error('[MIGRATE] Stack:', err.stack);
    if (connection) await connection.end();
    process.exit(1);
  }
}

migrate();
