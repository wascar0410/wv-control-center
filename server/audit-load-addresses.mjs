/**
 * audit-load-addresses.mjs
 * 
 * Audita y marca loads existentes sin direcciones como inválidos
 * 
 * Uso:
 * node server/audit-load-addresses.mjs
 */

import mysql from 'mysql2/promise';
import { URL } from 'url';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

// Parse DATABASE_URL
const parseDbUrl = (url) => {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  
  const [, user, pass, host, db] = match;
  const [hostname, port] = host.split(':');
  
  return {
    host: hostname,
    port: parseInt(port) || 3306,
    user,
    password: pass,
    database: db,
    ssl: 'amazon',
  };
};

const config = parseDbUrl(DATABASE_URL);

console.log('📊 [AUDIT] Starting load address audit...');
console.log('📊 [AUDIT] Connecting to database...');

const connection = await mysql.createConnection(config);

try {
  // 1. Count loads without addresses
  const [missingAddressStats] = await connection.execute(`
    SELECT 
      COUNT(*) as total_loads,
      SUM(CASE WHEN pickup_address IS NULL OR pickup_address = '' THEN 1 ELSE 0 END) as pickup_missing,
      SUM(CASE WHEN delivery_address IS NULL OR delivery_address = '' THEN 1 ELSE 0 END) as delivery_missing,
      SUM(CASE WHEN (pickup_address IS NULL OR pickup_address = '') AND (delivery_address IS NULL OR delivery_address = '') THEN 1 ELSE 0 END) as both_missing
    FROM loads
  `);

  const stats = missingAddressStats[0];
  console.log('\n📊 [AUDIT] Address Statistics:');
  console.log(`   Total loads: ${stats.total_loads}`);
  console.log(`   Pickup missing: ${stats.pickup_missing}`);
  console.log(`   Delivery missing: ${stats.delivery_missing}`);
  console.log(`   Both missing: ${stats.both_missing}`);

  // 2. Get sample of loads without addresses
  const [sampleLoads] = await connection.execute(`
    SELECT id, pickup_address, delivery_address, price, status
    FROM loads
    WHERE pickup_address IS NULL OR pickup_address = '' OR delivery_address IS NULL OR delivery_address = ''
    LIMIT 10
  `);

  if (sampleLoads.length > 0) {
    console.log('\n📋 [AUDIT] Sample of loads without addresses:');
    console.table(sampleLoads);
  }

  // 3. Mark loads without addresses as invalid (add comment to status or create flag)
  const [updateResult] = await connection.execute(`
    UPDATE loads
    SET status = CONCAT(status, ' [INVALID_ADDRESS]')
    WHERE (pickup_address IS NULL OR pickup_address = '' OR delivery_address IS NULL OR delivery_address = '')
    AND status NOT LIKE '%INVALID_ADDRESS%'
  `);

  console.log(`\n✅ [AUDIT] Marked ${updateResult.affectedRows} loads as INVALID_ADDRESS`);

  // 4. Log invalid loads
  const [invalidLoads] = await connection.execute(`
    SELECT id, pickup_address, delivery_address, status
    FROM loads
    WHERE status LIKE '%INVALID_ADDRESS%'
    LIMIT 20
  `);

  console.log(`\n📋 [AUDIT] Invalid loads (sample):`, invalidLoads.length > 0 ? 'Found' : 'None');
  if (invalidLoads.length > 0) {
    console.table(invalidLoads);
  }

  console.log('\n✅ [AUDIT] Address audit complete');
  console.log('\n🚨 [IMPORTANT] Next steps:');
  console.log('   1. Review loads marked as [INVALID_ADDRESS]');
  console.log('   2. Either provide addresses or delete invalid loads');
  console.log('   3. New loads MUST have addresses (enforced in createLoad())');

} catch (err) {
  console.error('❌ [AUDIT] Error:', err.message);
  process.exit(1);
} finally {
  await connection.end();
}
