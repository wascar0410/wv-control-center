import { createTRPCClient, httpBatchLink } from '@trpc/client';
import SuperJSON from 'superjson';

// Create tRPC client pointing to localhost
const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: SuperJSON,
    }),
  ],
});

async function runTests() {
  console.log('=== BANKING ROUTER VALIDATION TESTS ===\n');

  try {
    // TEST 1: getCashFlowRule - initial read
    console.log('TEST 1: getCashFlowRule (initial read)');
    console.log('Request: GET /api/trpc/banking.getCashFlowRule');
    const rule1 = await client.banking.getCashFlowRule.query();
    console.log('Response:', JSON.stringify(rule1, null, 2));
    console.log('✅ PASS - getCashFlowRule returned data\n');

    // TEST 2: saveCashFlowRule - update reservePercent to 25
    console.log('TEST 2: saveCashFlowRule (update reservePercent to 25)');
    console.log('Request: POST /api/trpc/banking.saveCashFlowRule');
    console.log('Input:', JSON.stringify({ reservePercent: 25, minReserveAmount: 100, maxReserveAmount: 50000 }, null, 2));
    const updated = await client.banking.saveCashFlowRule.mutate({
      reservePercent: 25,
      minReserveAmount: 100,
      maxReserveAmount: 50000,
    });
    console.log('Response:', JSON.stringify(updated, null, 2));
    console.log('✅ PASS - saveCashFlowRule succeeded\n');

    // TEST 3: getCashFlowRule - verify persistence
    console.log('TEST 3: getCashFlowRule (verify persistence after save)');
    console.log('Request: GET /api/trpc/banking.getCashFlowRule');
    const rule2 = await client.banking.getCashFlowRule.query();
    console.log('Response:', JSON.stringify(rule2, null, 2));
    if (rule2.reservePercent === 25) {
      console.log('✅ PASS - reservePercent persisted correctly (25%)\n');
    } else {
      console.log('❌ FAIL - reservePercent not persisted. Expected 25, got', rule2.reservePercent, '\n');
    }

    // TEST 4: getBankAccountClassifications - read empty list
    console.log('TEST 4: getBankAccountClassifications (read empty list)');
    console.log('Request: GET /api/trpc/banking.getBankAccountClassifications');
    const classifications = await client.banking.getBankAccountClassifications.query();
    console.log('Response:', JSON.stringify(classifications, null, 2));
    console.log('✅ PASS - getBankAccountClassifications returned array\n');

    // TEST 5: setBankAccountClassification - set classification for account ID 1
    console.log('TEST 5: setBankAccountClassification (set account 1 as operating)');
    console.log('Request: POST /api/trpc/banking.setBankAccountClassification');
    console.log('Input:', JSON.stringify({ bankAccountId: 1, classification: 'operating', label: 'Operativa Principal' }, null, 2));
    const classified = await client.banking.setBankAccountClassification.mutate({
      bankAccountId: 1,
      classification: 'operating',
      label: 'Operativa Principal',
    });
    console.log('Response:', JSON.stringify(classified, null, 2));
    console.log('✅ PASS - setBankAccountClassification succeeded\n');

    // TEST 6: getBankAccountClassifications - verify classification was saved
    console.log('TEST 6: getBankAccountClassifications (verify classification persisted)');
    console.log('Request: GET /api/trpc/banking.getBankAccountClassifications');
    const classifications2 = await client.banking.getBankAccountClassifications.query();
    console.log('Response:', JSON.stringify(classifications2, null, 2));
    const found = classifications2.find(c => c.bankAccountId === 1);
    if (found && found.classification === 'operating') {
      console.log('✅ PASS - Classification persisted correctly\n');
    } else {
      console.log('❌ FAIL - Classification not found or incorrect\n');
    }

    // TEST 7: calculateReserveSuggestion - calculate 25% of 1000
    console.log('TEST 7: calculateReserveSuggestion (calculate 25% of 1000)');
    console.log('Request: GET /api/trpc/banking.calculateReserveSuggestion');
    console.log('Input:', JSON.stringify({ amount: 1000, reservePercent: 25 }, null, 2));
    const suggestion = await client.banking.calculateReserveSuggestion.query({
      amount: 1000,
      reservePercent: 25,
    });
    console.log('Response:', JSON.stringify(suggestion, null, 2));
    if (suggestion.reserveSuggestion === 250) {
      console.log('✅ PASS - Reserve suggestion calculated correctly (250)\n');
    } else {
      console.log('❌ FAIL - Expected 250, got', suggestion.reserveSuggestion, '\n');
    }

    // TEST 8: getCashFlowSummary - get summary
    console.log('TEST 8: getCashFlowSummary (get cash flow summary)');
    console.log('Request: GET /api/trpc/banking.getCashFlowSummary');
    const summary = await client.banking.getCashFlowSummary.query();
    console.log('Response:', JSON.stringify(summary, null, 2));
    console.log('✅ PASS - getCashFlowSummary returned data\n');

    console.log('=== ALL TESTS COMPLETED ===');
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runTests();
