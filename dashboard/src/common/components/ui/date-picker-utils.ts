import { format, isValid, parse } from "date-fns";

export const DISPLAY_PATTERN = "MM/dd/yyyy";
const PARSE_PATTERNS = [DISPLAY_PATTERN, "yyyy-MM-dd"] as const;

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
