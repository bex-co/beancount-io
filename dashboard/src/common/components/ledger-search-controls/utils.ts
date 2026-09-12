/**
 * Helper function to calculate indent level for hierarchical items
 * e.g., "income" = 0, "income:work" = 1, "income:work:salary" = 2
 */
export const getIndentLevel = (item: string): number => {
  return (item.match(/:/g) || []).length;
};

/**
 * The ledger filter language compiles a quoted STRING value into a
 * case-insensitive regex (`new RegExp(value, "i")`), so literal punctuation in a
 * payee name must be escaped before it reaches the `filter` search param.
 */
const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

export const escapeFilterRegex = (value: string): string =>
  value.replace(REGEX_METACHARACTERS, "\\$&");

/**
 * Build a `payee:"…"` suggestion that matches the payee literally.
 *
 * The filter lexer's STRING token is `"[^"]*"|'[^']*'` and it strips the
 * delimiters without interpreting escapes, so the emitted backslashes must be
 * single (never `JSON.stringify`-doubled) and the delimiter must be one the
 * value does not contain. A value holding both quote characters cannot use
 * either delimiter verbatim, so the double quote is emitted as the regex hex
 * escape `\x22` instead.
 */
export const serializePayeeFilter = (payee: string): string => {
  const pattern = escapeFilterRegex(payee);
  if (!pattern.includes('"')) return `payee:"${pattern}"`;
  if (!pattern.includes("'")) return `payee:'${pattern}'`;
  return `payee:"${pattern.replace(/"/g, "\\x22")}"`;
};
