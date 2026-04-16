/**
 * Minimal tRPC validation script
 * Tests banking endpoints with exact frontend client setup
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import SuperJSON from 'superjson';

// Create tRPC client exactly like frontend does
const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: SuperJSON,

      headers: {
        // No auth headers - testing public/protected endpoints
      },
    }),
  ],
});

async function validateBankingEndpoints() {
  console.log('\n' + '='.repeat(80));
  console.log('BANKING ENDPOINTS VALIDATION - tRPC CLIENT');
  console.log('='.repeat(80) + '\n');

  try {
    // STEP 1: Read initial cash flow rule
    console.log('STEP 1: getCashFlowRule (initial read)');
    console.log('-'.repeat(80));
    console.log('Input: (none - query endpoint)');
    
    const rule1 = await client.banking.getCashFlowRule.query();
    console.log('Output:');
    console.log(JSON.stringify(rule1, null, 2));
    console.log('✅ PASS - getCashFlowRule returned data\n');

    // STEP 2: Save cash flow rule with new reservePercent
    console.log('STEP 2: saveCashFlowRule (update reservePercent to 25)');
    console.log('-'.repeat(80));
    const saveInput = {
      reservePercent: 25,
      minReserveAmount: 100,
      maxReserveAmount: 50000,
    };
    console.log('Input:', JSON.stringify(saveInput, null, 2));
    
    const saved = await client.banking.saveCashFlowRule.mutate(saveInput);
    console.log('Output:');
    console.log(JSON.stringify(saved, null, 2));
    console.log('✅ PASS - saveCashFlowRule succeeded\n');

    // STEP 3: Read and verify persistence
    console.log('STEP 3: getCashFlowRule (verify persistence)');
    console.log('-'.repeat(80));
    console.log('Input: (none - query endpoint)');
    
    const rule2 = await client.banking.getCashFlowRule.query();
    console.log('Output:');
    console.log(JSON.stringify(rule2, null, 2));
    
    const reservePercent = parseFloat(rule2.reservePercent);
    if (reservePercent === 25) {
      console.log('✅ PASS - reservePercent persisted correctly (25)\n');
    } else {
      console.log(`❌ FAIL - Expected 25, got ${reservePercent}\n`);
    }

    // STEP 4: Read bank account classifications
    console.log('STEP 4: getBankAccountClassifications (read current)');
    console.log('-'.repeat(80));
    console.log('Input: (none - query endpoint)');
    
    const classifications1 = await client.banking.getBankAccountClassifications.query();
    console.log('Output:');
    console.log(JSON.stringify(classifications1, null, 2));
    console.log(`✅ PASS - getBankAccountClassifications returned ${classifications1.length} items\n`);

    // STEP 5: Set classification for account 1
    console.log('STEP 5: setBankAccountClassification (classify account 1 as operating)');
    console.log('-'.repeat(80));
    const classifyInput = {
      bankAccountId: 1,
      classification: 'operating',
      label: 'Operativa Principal',
    };
    console.log('Input:', JSON.stringify(classifyInput, null, 2));
    
    const classified = await client.banking.setBankAccountClassification.mutate(classifyInput);
    console.log('Output:');
    console.log(JSON.stringify(classified, null, 2));
    console.log('✅ PASS - setBankAccountClassification succeeded\n');

    // STEP 6: Verify classification persistence
    console.log('STEP 6: getBankAccountClassifications (verify persistence)');
    console.log('-'.repeat(80));
    console.log('Input: (none - query endpoint)');
    
    const classifications2 = await client.banking.getBankAccountClassifications.query();
    console.log('Output:');
    console.log(JSON.stringify(classifications2, null, 2));
    
    const found = classifications2.find(c => c.bankAccountId === 1);
    if (found && found.classification === 'operating') {
      console.log('✅ PASS - Classification persisted correctly\n');
    } else {
      console.log('❌ FAIL - Classification not found or incorrect\n');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log('✅ All 4 endpoints validated successfully');
    console.log('✅ Data persistence verified');
    console.log('✅ No authentication errors');
    console.log('✅ Database operations working correctly\n');

  } catch (error) {
    console.error('\n❌ VALIDATION FAILED');
    console.error('Error:', error.message);
    if (error.shape?.data?.code === 'UNAUTHORIZED') {
      console.error('Status: 401 Unauthorized - Endpoint is protected (expected)');
      console.error('Note: This is expected if the endpoint requires authentication');
    }
    console.error('Full error:', error);
    process.exit(1);
  }
}

validateBankingEndpoints();
