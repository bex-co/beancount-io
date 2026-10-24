/**
 * Dates, in the language the app is running in.
 *
 * Every screen used to hard-code `toLocaleDateString("en-US", …)`, so a fully
 * Persian, right-to-left app still rendered `December 31, 2025` in its
 * transaction list. Three call sites, two of them byte-identical.
 *
 * Hermes here ships **full ICU** — verified on device: `Intl.DateTimeFormat`
 * exists and `supportedLocalesOf(["fa-IR","zh-Hans","de-DE","sk-SK"])` returns
 * all four — so there is no month-name table to hand-roll and no engine flag to
 * set. Passing the locale through is the whole job.
 *
 * Import-free, so the unit-test runner can require it and assert real formatted
 * output rather than mocking a formatter.
 */
import { utcDate } from "./calendar-date";

/**
 * The calendar is pinned to Gregorian, deliberately.
 *
 * ICU reads `fa` as the Persian calendar and would render 2025-12-31 as
 * ۱۰ دی ۱۴۰۴ — a genuinely better read for Persian speakers, and the wrong
 * thing for this app to do quietly. These dates are ledger dates: they exist as
 * `YYYY-MM-DD` Gregorian strings in a plain-text `.bean` file the user
 * reconciles against, and a list header that disagrees with the file it
 * describes is a bug however well-localized it is. Switching Persian to Jalali
 * is a product decision about which of those two truths wins, not a formatting
 * detail — `w1/027` records it as an open question.
 *
 * Numerals are left alone: Persian renders its own digits, which is correct
 * localization and still reads as the same year.
 */
function gregorian(locale: string): string {
  return `${locale}-u-ca-gregory`;
}

/**
 * One `Intl.DateTimeFormat` per locale and style: `toLocaleDateString` builds a
 * formatter on every call (about 83 µs), and a list header per date over
 * thousands of loaded rows paid it again on each page (w21/979).
 */
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${options.month}|${options.day ?? ""}|${options.year}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(gregorian(locale), {
      ...options,
      timeZone: "UTC",
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Long dates already written, by locale and day; cleared when it grows large. */
const longDates = new Map<string, string>();
const LONG_DATES_MAX = 20_000;

/**
 * A ledger date (`YYYY-MM-DD`) in long form — "December 31, 2025",
 * "31. Dezember 2025", "۳۱ دسامبر ۲۰۲۵".
 *
 * Parsed as UTC and formatted as UTC so the calendar day never shifts: these
 * strings carry no time, and letting the device's zone interpret them turns
 * every date into the previous day for anyone west of Greenwich.
 *
 * Returns the input unchanged if it cannot be parsed, so a malformed date shows
 * as itself rather than as "Invalid Date".
 */
export function formatLedgerDate(isoDate: string, locale: string): string {
  const cacheKey = `${locale}|${isoDate}`;
  const known = longDates.get(cacheKey);
  if (known !== undefined) return known;
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = utcDate(year, month - 1, day);
    if (isNaN(date.getTime())) {
      return isoDate;
    }
    const text = formatterFor(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
    if (longDates.size >= LONG_DATES_MAX) longDates.clear();
    longDates.set(cacheKey, text);
    return text;
  } catch {
    return isoDate;
  }
}

/**
 * A ledger month (`YYYY-MM`) by name — "August 2026", "August 2026" in German,
 * "اوت ۲۰۲۶". Same UTC / Gregorian rules as `formatLedgerDate`; the input
 * unchanged if it cannot be parsed.
 */
export function formatLedgerMonth(yearMonth: string, locale: string): string {
  try {
    const [year, month] = yearMonth.split("-").map(Number);
    const date = utcDate(year, month - 1, 1);
    if (isNaN(date.getTime())) {
      return yearMonth;
    }
    return formatterFor(locale, { month: "long", year: "numeric" }).format(
      date,
    );
  } catch {
    return yearMonth;
  }
}

/**
 * A ledger date in short form — "Aug 17, 2026", "17.08.2026" — for dense list
 * rows (Merchants directory) where the long form wastes the trailing column.
 *
 * Same UTC / Gregorian rules as `formatLedgerDate`.
 */
export function formatLedgerDateShort(isoDate: string, locale: string): string {
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = utcDate(year, month - 1, day);
    if (isNaN(date.getTime())) {
      return isoDate;
    }
    return formatterFor(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return isoDate;
  }
}

/**
 * A ledger date as numeric month and day in the locale's order — "3/2" in
 * English, "02/03" in French, "2.3." in German — for a chart's weekly and
 * daily ticks. A fixed US `month/day` read 3 February in day-first languages
 * (w21/096). Same UTC / Gregorian rules as `formatLedgerDate`.
 */
export function formatLedgerMonthDay(isoDate: string, locale: string): string {
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = utcDate(year, month - 1, day);
    if (isNaN(date.getTime())) {
      return isoDate;
    }
    return date.toLocaleDateString(gregorian(locale), {
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDate;
  }
}

/**
 * A timestamp in short form — "Aug 17, 2026" — for feed items, which carry a
 * real instant rather than a ledger day and so are shown in the device's zone.
 * `calendarDay` is for a date-only post sent as midnight UTC: read in the
 * device's zone it fell on the day before anywhere west of UTC (w21/147), so
 * its UTC day is shown.
 *
 * Returns an empty string when unparseable: a feed row without a date reads
 * fine, and one saying "Invalid Date" does not.
 */
export function formatFeedDate(
  publishedAt: unknown,
  locale: string,
  options: { calendarDay?: boolean } = {},
): string {
  try {
    // Guarded before `new Date`, which reads `null` as the epoch and would
    // date every feed item with a missing timestamp to 1 Jan 1970.
    if (typeof publishedAt !== "string" && typeof publishedAt !== "number") {
      return "";
    }
    const date = new Date(publishedAt);
    if (isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleDateString(gregorian(locale), {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(options.calendarDay ? { timeZone: "UTC" } : {}),
    });
  } catch {
    return "";
  }
}

/**
 * An instant as its day and time, "Sep 13, 2026, 12:00 PM", in the device's
 * zone (or `timeZone`, for a test): what a commit was made, told apart from
 * another the same day (w21/487). Empty when unparseable, like
 * {@link formatFeedDate}.
 */
export function formatMoment(
  value: unknown,
  locale: string,
  timeZone?: string,
): string {
  try {
    if (typeof value !== "string" && typeof value !== "number") return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString(gregorian(locale), {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    return "";
  }
}

/**
 * Latin digits in `text` written in the language's own, as the dates beside
 * them are: Persian shows "۱۲/۲۸ 25" and "· اوت 2026" next to "۳۱ اوت ۲۰۲۶"
 * when a year or a count is sliced from a ledger string and appended raw
 * (w21/884, w21/885). The English-style digit languages are returned as they
 * were.
 */
export function localizeDigits(text: string, locale: string): string {
  try {
    const sample = new Intl.NumberFormat(locale, { useGrouping: false }).format(
      7,
    );
    if (sample === "7") return text;
    const format = new Intl.NumberFormat(locale, { useGrouping: false });
    return text.replace(/\d/g, (digit) => format.format(Number(digit)));
  } catch {
    return text;
  }
}
