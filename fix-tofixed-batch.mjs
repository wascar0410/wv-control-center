#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Archivos a procesar en BATCH 1
const BATCH_1_FILES = [
  'client/src/components/QuotationResults.tsx',
  'client/src/components/ComparisonAnalytics.tsx',
  'client/src/components/LoadEvaluatorResults.tsx',
  'client/src/pages/TaxCompliance.tsx',
  'client/src/lib/generateEvaluationPDF.ts',
  'client/src/components/QuotationResultsTable.tsx',
  'client/src/pages/ExecutiveDashboard.tsx',
  'client/src/pages/AccountingFinance.tsx',
  'client/src/lib/generateFiscalReportPDF.ts',
  'client/src/pages/Finance.tsx',
];

const SAFE_HELPERS = `
// 🔥 SAFE HELPERS
const safeNum = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
const money = (v: any) => \`$\${safeNum(v).toFixed(2)}\`;
const percent = (v: any) => \`\${safeNum(v).toFixed(1)}%\`;
const fixed = (v: any, d = 2) => safeNum(v).toFixed(d);
`;

function hasHelpers(content) {
  return content.includes('const safeNum = (v: any)');
}

function addHelpers(content, isTypeScript = true) {
  if (hasHelpers(content)) return content;

  // Find the first import or export
  const importMatch = content.match(/^(import|export)/m);
  if (importMatch) {
    const index = content.indexOf(importMatch[0]);
    // Find the end of the first line
    const lineEnd = content.indexOf('\n', index);
    return content.slice(0, lineEnd + 1) + '\n' + SAFE_HELPERS + '\n' + content.slice(lineEnd + 1);
  }

  return SAFE_HELPERS + '\n\n' + content;
}

function fixToFixed(content) {
  // Pattern: value.toFixed(n) where value is not already wrapped
  // This is a simple regex that catches most cases
  
  // Replace: ${value.toFixed(2)} with ${fixed(value, 2)}
  content = content.replace(/\$\{([^}]+)\.toFixed\((\d+)\)\}/g, (match, value, decimals) => {
    // Don't replace if already using our helpers
    if (value.includes('safeNum') || value.includes('money') || value.includes('percent') || value.includes('fixed')) {
      return match;
    }
    return `\${fixed(${value}, ${decimals})}`;
  });

  // Replace: value.toFixed(n) in JSX/template strings
  content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\.toFixed\((\d+)\)/g, (match, value, decimals) => {
    // Skip if already wrapped
    if (value.includes('safeNum') || value.includes('money') || value.includes('percent') || value.includes('fixed')) {
      return match;
    }
    // Skip if it's part of a larger expression
    if (value.includes('(') || value.includes('[')) {
      return match;
    }
    return `fixed(${value}, ${decimals})`;
  });

  return content;
}

function processFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${filePath} - NOT FOUND`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // Add helpers if not present
    content = addHelpers(content);

    // Fix .toFixed() calls
    content = fixToFixed(content);

    // Only write if changed
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      const changes = (originalContent.match(/\.toFixed/g) || []).length;
      console.log(`✅ ${filePath} - Fixed ${changes} .toFixed() calls`);
      return true;
    } else {
      console.log(`⏭️  ${filePath} - No changes needed`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${filePath} - ERROR: ${error.message}`);
    return false;
  }
}

console.log('🔧 BATCH 1: Fixing .toFixed() in 10 critical files...\n');

let fixed = 0;
for (const file of BATCH_1_FILES) {
  if (processFile(file)) fixed++;
}

console.log(`\n✅ BATCH 1 COMPLETE: ${fixed}/${BATCH_1_FILES.length} files fixed`);
