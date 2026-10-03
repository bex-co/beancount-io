import { BadUserInputError } from "@/shared/errors";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A directive's date as a `Date`, or a refusal the caller can act on.
 *
 * A directive date arrives as a bare string. `new Date("2026-13-45")` is an
 * Invalid Date, and the file router's `toISOString()` on it throws a
 * `RangeError` — which every surface reported as a server fault for what is a
 * typo in the request (w5/033). `new Date` also rolls `2026-02-30` over into
 * March rather than refusing it, so the calendar check is done by hand.
 */
export function parseDirectiveDate(value: string, label = "date"): Date {
  const match = ISO_DATE.exec(value);
  if (match) {
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
  }
  throw new BadUserInputError(
    `${label} "${value}" is not a calendar date; use YYYY-MM-DD`,
    "date",
  );
}
