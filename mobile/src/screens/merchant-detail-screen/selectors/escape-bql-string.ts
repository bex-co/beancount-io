/**
 * Escape a value for interpolation into a fixed app-authored BQL string
 * literal. Returns the full quoted literal (including surrounding `"`).
 *
 * Dialect (validated 2026-08-20 against live `queryShell`): double-quoted
 * strings with `\\` and `\"` escapes. SQL-style `''` doubling is rejected by
 * the backend for some inputs, so it is not used.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
export function escapeBqlString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}
