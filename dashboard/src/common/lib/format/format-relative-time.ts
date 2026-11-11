import { formatDistanceToNow } from "date-fns";
import type { Locale } from "react-day-picker";

const nativeDigits = new Map<string, string[] | null>();

/**
 * The digits 0–9 as `code` writes them, or null when they are the ASCII
 * ones. date-fns spells relative ages with ASCII digits in every locale, so
 * Persian read "11 روز پیش" beside Persian dates and amounts (w2/125).
 */
function digitsOf(code: string | undefined): string[] | null {
  if (!code) return null;
  if (!nativeDigits.has(code)) {
    let digits: string[] | null = null;
    try {
      const format = new Intl.NumberFormat(code, { useGrouping: false });
      const written = Array.from({ length: 10 }, (_, digit) =>
        format.format(digit),
      );
      digits = written[0] === "0" ? null : written;
    } catch {
      digits = null;
    }
    nativeDigits.set(code, digits);
  }
  return nativeDigits.get(code) ?? null;
}

/** Relative age string for the given date-fns / DayPicker locale. */
export function formatRelativeTime(
  date: Date | number,
  locale: Locale,
  options: { addSuffix?: boolean } = { addSuffix: true },
): string {
  const text = formatDistanceToNow(date, {
    addSuffix: options.addSuffix ?? true,
    locale,
  });
  const digits = digitsOf(locale.code);
  return digits
    ? text.replace(/[0-9]/g, (digit) => digits[Number(digit)]!)
    : text;
}
