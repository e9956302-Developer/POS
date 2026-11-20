/**
 * Utility functions for clean number and price formatting.
 * Strips unnecessary trailing zeros after decimals (e.g. 150.00 -> 150, 150.50 -> 150.5).
 */

/**
 * Strips unnecessary trailing zeros and trailing decimal points from numeric values or strings.
 * Examples:
 *  "150.00" -> "150"
 *  150.00   -> "150"
 *  "150.50" -> "150.5"
 *  "150.25" -> "150.25"
 *  "0.00"   -> "0"
 *  "150."   -> "150"
 *  "" / null / undefined -> ""
 *
 * @param {string|number} val
 * @returns {string}
 */
export function stripTrailingZeros(val) {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return String(val);
  // String(num) in JavaScript natively strips trailing decimal zeros:
  // String(Number("150.00")) === "150"
  // String(Number("150.50")) === "150.5"
  // String(Number("150.25")) === "150.25"
  // String(Number("0.00")) === "0"
  return String(num);
}

/**
 * Formats a number with thousands separators while omitting trailing decimal zeros (.00).
 * Examples:
 *  1500     -> "1,500"
 *  1500.5   -> "1,500.5"
 *  1500.25  -> "1,500.25"
 *  0        -> "0"
 *
 * @param {string|number} val
 * @param {object} [options]
 * @returns {string}
 */
export function formatCleanPrice(val, options = {}) {
  const num = Number(val || 0);
  if (isNaN(num) || !isFinite(num)) return "0";
  return num.toLocaleString(options.locale || undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2
  });
}
