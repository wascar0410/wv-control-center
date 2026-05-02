/**
 * safeNumber.ts
 * Helper to safely convert and validate numeric values
 * Prevents "Cannot read properties of undefined" errors when calling toFixed()
 */

/**
 * Safely convert any value to a number, returning 0 if invalid
 * @param value - Value to convert (can be number, string, null, undefined)
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns Safe number value
 */
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // Convert to number
  const num = Number(value);

  // Return default if NaN
  return isNaN(num) ? defaultValue : num;
};

/**
 * Format a value as currency with safe number conversion
 * @param value - Value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const safeCurrency = (
  value: any,
  decimals: number = 2
): string => {
  const num = safeNumber(value, 0);
  return `$${num.toFixed(decimals)}`;
};

/**
 * Format a value as percentage with safe number conversion
 * @param value - Value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const safePercent = (
  value: any,
  decimals: number = 1
): string => {
  const num = safeNumber(value, 0);
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format a value as fixed decimal with safe number conversion
 * @param value - Value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted decimal string
 */
export const safeFixed = (
  value: any,
  decimals: number = 2
): string => {
  const num = safeNumber(value, 0);
  return num.toFixed(decimals);
};
