/**
 * A date as written in ledger source. Beancount's lexer reads a date as four
 * digits, `-` or `/`, the month, `-` or `/`, the day, so `2026/08/30` and
 * `2026-8-30` are dates as much as `2026-08-30`; the engine loads all three and
 * reports every one as `2026-08-30`. Matching only the zero-padded dash form
 * left such an entry with no source slice, so it could not be read or edited
 * by its hash (w31/106). `managed-price-overlay.ts` reads price dates this way
 * too (w1/163).
 */
export const SOURCE_DATE = String.raw`\d{4}[-/]\d{1,2}[-/]\d{1,2}`;

const SOURCE_DATE_PREFIX = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/u;

/**
 * The `YYYY-MM-DD` date the engine reports for a line that starts with a
 * source date, or `undefined` when the line does not start with one.
 */
export function sourceDateOf(line: string): string | undefined {
  const match = SOURCE_DATE_PREFIX.exec(line);
  if (match === null) return undefined;
  const [, year, month, day] = match;
  return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
}
