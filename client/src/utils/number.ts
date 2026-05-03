/**
 * number.ts
 * Global safe number formatting utilities
 * Prevents "Cannot read properties of undefined" errors
 */

/**
 * Safely convert any value to a number, returning 0 if invalid
 */
export const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

/**
 * Safely format a number to fixed decimals
 * Returns "0.00" if value is invalid
 */
export const toFixedSafe = (value: any, decimals: number = 2): string => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toFixed(decimals);
};
