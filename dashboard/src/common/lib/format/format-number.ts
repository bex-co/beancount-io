/**
 * Format a number respecting the beancount render_commas option.
 *
 * @param value       - The numeric value to format
 * @param renderCommas - When true, adds thousands separators (e.g. 1,234,567.89).
 *                       When false, omits them (e.g. 1234567.89).
 * @param locale      - Explicit formatting locale. Required for separators:
 *                      without it `toLocaleString` uses the runtime default, so
 *                      the server renders "80,149.807" and a French browser
 *                      hydrates "80 149,807", which React resolves by throwing
 *                      away and regenerating the server-rendered report tree.
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  renderCommas: boolean,
  locale: string,
): string => {
  if (renderCommas) {
    return value.toLocaleString(locale);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  // Preserve up to 2 decimal places, strip trailing zeros
  return value.toFixed(2).replace(/\.?0+$/, "");
};
