#!/usr/bin/env node

/**
 * fix-tofixed.mjs
 * Script to replace unsafe .toFixed() calls with safeNumber().toFixed()
 * Usage: node fix-tofixed.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const componentsDir = path.join(__dirname, 'client/src/components');
const pagesDir = path.join(__dirname, 'client/src/pages');

// Pattern to find .toFixed() calls that are NOT already wrapped in safeNumber()
const toFixedPattern = /(?<!safeNumber\([^)]*?)(\w+(?:\.\w+)*|\w+\([^)]*\))\.toFixed\(/g;

function hasImport(content, importName) {
  return content.includes(`import { ${importName}`) ||
         content.includes(`import { ... ${importName}`) ||
         content.includes(`from "@/utils/safeNumber"`);
}

function addImport(content) {
  if (hasImport(content, 'safeNumber')) {
    return content;
  }

  // Find the last import statement
  const lastImportMatch = content.match(/import\s+.*?from\s+['"][^'"]+['"];/gs);
  if (!lastImportMatch) {
    return content;
  }

  const lastImport = lastImportMatch[lastImportMatch.length - 1];
  const insertPoint = content.indexOf(lastImport) + lastImport.length;

  return (
    content.slice(0, insertPoint) +
    '\nimport { safeNumber } from "@/utils/safeNumber";' +
    content.slice(insertPoint)
  );
}

function fixToFixed(content) {
  // Replace patterns like: value.toFixed(2) → safeNumber(value).toFixed(2)
  // But skip if already wrapped in safeNumber()

  let fixed = content;
  let changed = false;

  // Find all .toFixed( calls
  const matches = [...content.matchAll(/(\w+(?:\.\w+)*|\w+\([^)]*\))\.toFixed\(/g)];

  for (const match of matches.reverse()) {
    const fullMatch = match[0];
    const beforeMatch = content.substring(0, match.index);

    // Check if already wrapped in safeNumber()
    const lastOpenParen = beforeMatch.lastIndexOf('(');
    const lastSafeNumber = beforeMatch.lastIndexOf('safeNumber');

    if (lastSafeNumber !== -1 && lastOpenParen > lastSafeNumber) {
      // Already wrapped, skip
      continue;
    }

    const expr = match[1];
    const replacement = `safeNumber(${expr}).toFixed(`;

    fixed = fixed.substring(0, match.index) + replacement + fixed.substring(match.index + fullMatch.length);
    changed = true;
  }

  return { fixed, changed };
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Check if file has .toFixed
    if (!content.includes('.toFixed(')) {
      return { processed: false, reason: 'No .toFixed() found' };
    }

    // Add import
    content = addImport(content);

    // Fix toFixed calls
    const { fixed, changed } = fixToFixed(content);
    content = fixed;

    if (!changed) {
      return { processed: false, reason: 'No unsafe .toFixed() found' };
    }

    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    return { processed: true, changes: 'Applied safeNumber()' };
  } catch (error) {
    return { processed: false, reason: `Error: ${error.message}` };
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  const results = {};

  for (const file of files) {
    if (!file.endsWith('.tsx')) continue;

    const filePath = path.join(dir, file);
    const result = processFile(filePath);

    if (result.processed) {
      console.log(`✓ ${file}: ${result.changes}`);
      results[file] = result;
    } else {
      console.log(`- ${file}: ${result.reason}`);
    }
  }

  return results;
}

console.log('[FIX-TOFIXED] Starting...\n');

console.log('Processing components...');
const componentResults = processDirectory(componentsDir);

console.log('\nProcessing pages...');
const pageResults = processDirectory(pagesDir);

const totalProcessed = Object.keys(componentResults).length + Object.keys(pageResults).length;
console.log(`\n[FIX-TOFIXED] Completed! Processed ${totalProcessed} files.`);
