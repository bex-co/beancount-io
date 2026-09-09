import { formatDistanceToNow } from "date-fns";
import type { Locale } from "react-day-picker";

/** Relative age string for the given date-fns / DayPicker locale. */
export function formatRelativeTime(
  date: Date | number,
  locale: Locale,
  options: { addSuffix?: boolean } = { addSuffix: true },
): string {
  return formatDistanceToNow(date, {
    addSuffix: options.addSuffix ?? true,
    locale,
  });
}
