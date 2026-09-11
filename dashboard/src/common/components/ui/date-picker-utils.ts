import {
  addYears,
  endOfYear,
  format,
  isValid,
  parse,
  startOfYear,
} from "date-fns";

export const DISPLAY_PATTERN = "MM/dd/yyyy";
const PARSE_PATTERNS = [DISPLAY_PATTERN, "yyyy-MM-dd"] as const;

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

/** Strict calendar-date parse; rejects partial text and month-length rollover. */
export function parseStrictCalendarDate(input: string): Date | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  for (const pattern of PARSE_PATTERNS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed) && format(parsed, pattern) === trimmed) {
      return parsed;
    }
  }
  return undefined;
}
