/**
 * Beancount skips a whole line that starts with `*`, `#`, `:`, `!`, `&`, `?`
 * or `%` (an org-mode heading or another non-directive), and a `"` on it opens
 * no string. The ledger service applies the same rule before the engine
 * parses (`isSkippedLine` in
 * `backend-cluster/ledger/src/foundation/rustledger/parseable-files.ts`,
 * w21/654); packages share no code, so it is restated here. Every line scanner
 * over ledger text reads it the same way (w31/099).
 */
const SKIPPED_LINE_START = /^[*#:!&?%]/u;

/**
 * Whether Beancount skips `line` whole. Only meaningful for a line that starts
 * outside a string: inside one, the first character is the string's content.
 */
export function isSkippedLine(line: string): boolean {
  return SKIPPED_LINE_START.test(line);
}
