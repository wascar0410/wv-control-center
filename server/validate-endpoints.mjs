/**
 * Endpoint Validation Script
 * Tests all critical endpoints to ensure they return correct structures
 */

import dotenv from "dotenv";
dotenv.config();

const API_URL = "http://localhost:3000/api/trpc";
const TEST_USER_ID = 1; // Will be set after creating test user

// Helper function to make tRPC calls
async function callTRPC(procedure, input = {}) {
  const url = `${API_URL}/${procedure}`;
  const queryString = Object.keys(input).length > 0 ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
  
  try {
    const response = await fetch(url + queryString, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    
    if (data.error) {
      return { error: data.error, status: response.status };
    }
    
    return { data: data.result?.data, status: response.status };
  } catch (err) {
    return { error: err.message, status: 0 };
  }
}

// Validation tests
const tests = [
  {
    name: "wallet.getWalletSummary",
    procedure: "wallet.getWalletSummary",
    expectedFields: ["wallet", "recentTransactions", "pendingWithdrawals"],
    expectedTypes: { wallet: "object", recentTransactions: "array", pendingWithdrawals: "array" },
  },
  {
    name: "wallet.getStats",
    procedure: "wallet.getStats",
    expectedFields: ["totalEarnings", "availableBalance", "pendingBalance", "blockedBalance"],
    expectedTypes: { totalEarnings: "number", availableBalance: "number", pendingBalance: "number", blockedBalance: "number" },
  },
  {
    name: "wallet.getTransactions",
    procedure: "wallet.getTransactions",
    input: { limit: 50, offset: 0 },
    expectedType: "array",
  },
  {
    name: "wallet.getWithdrawals",
    procedure: "wallet.getWithdrawals",
    input: { limit: 50, offset: 0 },
    expectedType: "array",
  },
  {
    name: "settlement.getAll",
    procedure: "settlement.getAll",
    input: { limit: 50, offset: 0 },
    expectedType: "array",
  },
  {
    name: "invoicing.getAgingReport",
    procedure: "invoicing.getAgingReport",
    expectedFields: ["current", "30_days", "60_days", "90_days", "120_plus", "totalOutstanding"],
    expectedTypes: {
      current: "object",
      "30_days": "object",
      "60_days": "object",
      "90_days": "object",
      "120_plus": "object",
      totalOutstanding: "number",
    },
  },
  {
    name: "alertsAndTasks.getMyAlerts",
    procedure: "alertsAndTasks.getMyAlerts",
    input: { limit: 50 },
    expectedType: "array",
  },
  {
    name: "alertsAndTasks.getUnreadCount",
    procedure: "alertsAndTasks.getUnreadCount",
    expectedType: "number",
  },
  {
    name: "quoteAnalysis.getAll",
    procedure: "quoteAnalysis.getAll",
    input: { limit: 100, offset: 0 },
    expectedType: "array",
  },
  {
    name: "quoteAnalysis.getSummary",
    procedure: "quoteAnalysis.getSummary",
    expectedFields: ["totalAnalyzed", "acceptedCount", "negotiateCount", "rejectedCount", "avgMargin", "brokerSummary"],
    expectedTypes: { totalAnalyzed: "number", acceptedCount: "number", brokerSummary: "array" },
  },
];

// Run tests
async function runValidation() {
  console.log("🧪 Starting Endpoint Validation...\n");
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    const result = await callTRPC(test.procedure, test.input || {});
    
    if (result.error) {
      console.log(`❌ ERROR (${result.status}): ${result.error}`);
      failed++;
      results.push({ test: test.name, status: "FAILED", error: result.error });
      continue;
    }
    
    const data = result.data;
    
    // Validate structure
    let isValid = true;
    let issues = [];
    
    if (test.expectedType) {
      const actualType = Array.isArray(data) ? "array" : typeof data;
      if (actualType !== test.expectedType) {
        isValid = false;
        issues.push(`Expected type ${test.expectedType}, got ${actualType}`);
      }
    }
    
    if (test.expectedFields) {
      for (const field of test.expectedFields) {
        if (!(field in data)) {
          isValid = false;
          issues.push(`Missing field: ${field}`);
        }
      }
    }
    
    if (test.expectedTypes) {
      for (const [field, expectedType] of Object.entries(test.expectedTypes)) {
        const actualType = Array.isArray(data[field]) ? "array" : typeof data[field];
        if (actualType !== expectedType) {
          isValid = false;
          issues.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }
    
    if (isValid) {
      console.log(`✅ PASSED`);
      passed++;
      results.push({ test: test.name, status: "PASSED", data: JSON.stringify(data).substring(0, 100) });
    } else {
      console.log(`⚠️ FAILED: ${issues.join(", ")}`);
      failed++;
      results.push({ test: test.name, status: "FAILED", issues });
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 VALIDATION RESULTS`);
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log("\nDetailed Results:");
  console.table(results);
  
  process.exit(failed > 0 ? 1 : 0);
}

runValidation().catch(console.error);
