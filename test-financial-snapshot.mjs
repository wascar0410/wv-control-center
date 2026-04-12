import { getLoadFinancialSnapshot } from './server/db-dispatch-helpers.ts';

async function test() {
  console.log('Testing getLoadFinancialSnapshot...');
  try {
    const snapshot = await getLoadFinancialSnapshot(270002);
    console.log('✅ Snapshot:', snapshot);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
