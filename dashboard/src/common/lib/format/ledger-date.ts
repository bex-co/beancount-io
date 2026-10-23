/**
 * A formatter for ledger dates in the reader's language, always on the
 * Gregorian calendar. Ledger dates are Gregorian (the file, the Journal, the
 * period tables, CSV and the date picker all say `2026-08-28`), but
 * `Intl.DateTimeFormat("fa")` defaults to the Solar Hijri calendar, which
 * titled August 2026's figures "شهریور ۱۴۰۵" — a month they are not. Month
 * names and numerals still follow the language ("اوت ۲۰۲۶").
 *
 * Instants that are not ledger dates (commit times, sign-up dates) may keep
 * the locale's own calendar.
 */
export function ledgerDateFormat(
  language: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(language, { ...options, calendar: "gregory" });
}

/**
 * A `YYYY-MM-DD` ledger date written as that calendar day in the reader's
 * language, or `null` when it is not one. It is read and formatted in UTC: the
 * local midnight of a day the browser's zone skipped (Apia's 2011-12-30,
 * Kiritimati's 1994-12-31) rolls into the next day, so a December price read
 * as December 31 and a December figure as January (w4/1027).
 */
export function formatLedgerDate(
  date: string,
  language: string,
  options: Intl.DateTimeFormatOptions,
): string | null {
  const day = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) return null;
  return ledgerDateFormat(language, { ...options, timeZone: "UTC" }).format(
    day,
  );
}
