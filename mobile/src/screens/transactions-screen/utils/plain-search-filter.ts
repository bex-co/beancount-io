/**
 * Serialize ordinary Transactions search text into a Fava advanced-filter
 * STRING literal. Bare tokens reject punctuation (e.g. `Mr. Marcel` →
 * Illegal character "."), while quoted strings accept it. The matched value
 * is compiled as a case-insensitive regex, so metacharacters must be escaped
 * before quoting.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @returns A filter expression, or `undefined` when the input is empty/whitespace
 *   so the GraphQL variable can be omitted.
 */
export function toPlainSearchFilter(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Lexer forms: `"[^"]*"` and `'[^']*'`, with no escape processing inside.
  // Prefer double quotes; fall back to single quotes when the needle itself
  // contains `"`. When both quote kinds appear, keep double quotes and encode
  // each embedded `"` as the regex escape `\x22`, so the literal still lexes
  // and still matches the quote. `escapeRegExp` escapes typed backslashes
  // first, so a typed `\x22` stays literal text rather than becoming a quote.
  const escaped = escapeRegExp(trimmed);

  if (!escaped.includes('"')) {
    return `"${escaped}"`;
  }
  if (!escaped.includes("'")) {
    return `'${escaped}'`;
  }
  return `"${escaped.replace(/"/g, "\\x22")}"`;
}
