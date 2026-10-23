/**
 * Text as a Beancount quoted string. The lexer reads `\"` as a quote and a
 * backslash as the start of an escape (`\t`, `\r`, …), so both are escaped,
 * backslashes first; `C:\temp` then reads back as `C:\temp`, not a tab
 * (w4/981). Line breaks and other text stay as written.
 */
export function beancountString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
