/**
 * Display formatting for the importer's canonical `YYYY-MM-DD` ledger dates.
 */

import { parseDate } from "./csv-validator";

/**
 * Render a canonical `YYYY-MM-DD` import date in the user's locale format
 * without moving the calendar day.
 *
 * The instant is built with `Date.UTC` and read back with `timeZone: "UTC"`, so
 * neither a negative offset (which would show the previous day) nor a zone that
 * never had that local midnight can shift it. Unparseable input is shown
 * verbatim rather than as "Invalid Date".
 */
export function formatImportDateForDisplay(
  isoDate: string,
  locales?: Intl.LocalesArgument,
): string {
  if (!parseDate(isoDate).valid) {
    return isoDate;
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locales, {
    timeZone: "UTC",
  });
}
