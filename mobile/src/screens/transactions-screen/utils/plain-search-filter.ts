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

  // Lexer forms: `"[^"]*"` and `'[^']*'`. Prefer double quotes; fall back to
  // single quotes when the needle itself contains `"`. If both quote kinds
  // appear, drop embedded doubles so a double-quoted literal stays lexable.
  const forLiteral = trimmed.includes('"') && trimmed.includes("'")
    ? trimmed.replace(/"/g, "")
    : trimmed;
  const escaped = escapeRegExp(forLiteral);

  if (!escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return `'${escaped}'`;
}
