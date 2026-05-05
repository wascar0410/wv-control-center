/**
 * number.ts
 * Structured number system for financial integrity
 * 
 * 3 types:
 * 1. CRITICAL (money) → toMoney() - throws on invalid
 * 2. UI (stats, charts) → toFixedSafe() - fallback to 0
 * 3. OPTIONAL (display) → toDisplay() - shows "-" on invalid
 */

/**
 * Parse any value to number, returns null if invalid
 * This is the foundation - never silently convert to 0
 */
export const parseNumber = (value: any): number | null => {
  const num = Number(value);
  return isNaN(num) ? null : num;
};

/**
 * CRITICAL: For financial values (price, profit, revenue)
 * Logs error and returns "ERR" if invalid
 * This EXPOSES backend issues instead of hiding them
 */
export const toMoney = (value: any, decimals: number = 2): string => {
  const num = parseNumber(value);
  if (num === null) {
    console.error("🚨 [toMoney] Invalid financial value from backend:", value);
    return "ERR";
  }
  return num.toFixed(decimals);
};

/**
 * UI: For non-critical numbers (percentages, stats, chart data)
 * Safe fallback to 0 for display purposes
 */
export const toFixedSafe = (value: any, decimals: number = 2): string => {
  const num = parseNumber(value);
  return num === null ? "0.00" : num.toFixed(decimals);
};

/**
 * OPTIONAL: For values that might be missing
 * Shows "-" placeholder instead of 0
 * Better UX than showing 0 for missing data
 */
export const toDisplay = (value: any, decimals: number = 2): string => {
  const num = parseNumber(value);
  return num === null ? "-" : num.toFixed(decimals);
};

/**
 * Utility: Check if value is valid number
 */
export const isValidNumber = (value: any): boolean => {
  return parseNumber(value) !== null;
};

/**
 * Utility: Safe number for comparisons
 */
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  const num = parseNumber(value);
  return num === null ? defaultValue : num;
};

/**
 * TEMPORARY FALLBACK (remove after full cleanup)
 * Prevents crashes if old code references safe()
 */
export const safe = (v: any) => {
  console.warn("⚠️ DEPRECATED: safe() used - should use toMoney/toFixedSafe/toDisplay instead", v);
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
