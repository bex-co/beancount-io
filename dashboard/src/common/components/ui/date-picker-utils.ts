import {
  addYears,
  endOfYear,
  format,
  isValid,
  parse,
  startOfYear,
  type Locale as DateFnsLocale,
} from "date-fns";

/** Always-accepted fallback, in every language. */
export const ISO_PATTERN = "yyyy-MM-dd";

/** Used when a locale exposes no short date pattern; the en-US short pattern. */
const FALLBACK_PATTERN = "MM/dd/yyyy";

/** Years before/after the displayed month for DayPicker dropdown navigation. */
const DROPDOWN_YEAR_SPAN = 100;

/**
 * Rolling start/end months so the year dropdown is not clamped to "today's year".
 * Recompute from the displayed month so browsing past a bound does not freeze the range.
 */
export function rollingCalendarBounds(anchor: Date): {
  startMonth: Date;
  endMonth: Date;
} {
  return {
    startMonth: startOfYear(addYears(anchor, -DROPDOWN_YEAR_SPAN)),
    endMonth: endOfYear(addYears(anchor, DROPDOWN_YEAR_SPAN)),
  };
}

/**
 * Short numeric date pattern for the active app language — "MM/dd/yyyy" for
 * English, "dd/MM/yyyy" for French, "dd.MM.yyyy" for German, and so on.
 * Order and separators come from the locale's own short date format; any
 * year run is widened to yyyy so a two-digit year can never round-trip —
 * a ledger date needs a full year, and m24 forbids partial-input expansion.
 */
export function getDisplayPattern(locale: DateFnsLocale): string {
  const raw = locale.formatLong.date({ width: "short" });
  return widenYearToken(raw || FALLBACK_PATTERN);
}

/**
 * Uppercase rendering of a pattern for use as an input hint, e.g.
 * "MM/dd/yyyy" becomes "MM/DD/YYYY". Derived from the pattern actually
 * parsed so the hint cannot drift from the parser.
 */
export function getPatternHint(pattern: string): string {
  return pattern.toUpperCase();
}

/** Replace every unquoted y-run with yyyy; quoted literals pass through. */
function widenYearToken(pattern: string): string {
  let out = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "'") {
      // Copy the quoted literal verbatim; '' is an escaped quote.
      out += ch;
      i += 1;
      while (i < pattern.length) {
        out += pattern[i];
        if (pattern[i] === "'") {
          if (pattern[i + 1] === "'") {
            out += pattern[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === "y") {
      while (i < pattern.length && pattern[i] === "y") i += 1;
      out += "yyyy";
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * Strict calendar-date parse under exactly one locale pattern plus the ISO
 * fallback; rejects partial text and month-length rollover. Never tries
 * several orderings: input matching neither pattern is invalid, so a
 * day-first string under a month-first language (or vice versa) is refused
 * rather than silently reinterpreted.
 */
export function parseStrictCalendarDate(
  input: string,
  displayPattern: string,
): Date | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  for (const pattern of [displayPattern, ISO_PATTERN]) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed) && format(parsed, pattern) === trimmed) {
      return parsed;
    }
  }
  return undefined;
}
