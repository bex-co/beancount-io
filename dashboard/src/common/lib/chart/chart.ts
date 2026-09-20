import numbro from "numbro";

/** Significant digits kept for a tick smaller than one. */
const FRACTIONAL_SIGNIFICANT_DIGITS = 2;

/** Below this magnitude, even two significant digits are unreadable inline. */
const EXPONENTIAL_BELOW = 1e-4;

/**
 * Format a number for Y-axis display in charts
 * Converts numbers to abbreviated format (e.g., 1000 => "1.0k")
 *
 * The abbreviated `0.0a` pattern keeps a single mantissa digit, which renders
 * every fractional tick as "0.0" — a 0.04 BTC axis read as six identical
 * zeros. Ticks below one therefore keep two significant digits instead, which
 * is enough to tell 0.003 from 0.006 and 0.019 from 0.020; an actual zero
 * still reads "0.0", and everything from one upward is unchanged.
 *
 * @param numberString - The number to format (as string or number)
 * @returns Formatted number with abbreviation
 * @example
 * formatYAxisNumber(1000) // => "1.0k"
 * formatYAxisNumber(1500000) // => "1.5m"
 * formatYAxisNumber(0.04) // => "0.04"
 */
export const formatYAxisNumber = (numberString: string | number): string => {
  const value =
    typeof numberString === "number" ? numberString : Number(numberString);

  if (Number.isFinite(value) && value !== 0 && Math.abs(value) < 1) {
    if (Math.abs(value) < EXPONENTIAL_BELOW) {
      return value.toExponential(1);
    }
    // `toPrecision` may return exponential form; `Number` normalises it back
    // and drops the trailing zeros it pads with.
    return String(Number(value.toPrecision(FRACTIONAL_SIGNIFICANT_DIGITS)));
  }

  return numbro(numberString).format("0.0a");
};

import { parseISO, format, getISOWeek, getISOWeekYear } from "date-fns";
import type { ChartInterval } from "@/common/types/chart";

/**
 * Format a date string for chart axis display based on interval
 * @param date - Date string to format
 * @param interval - The chart interval (yearly, quarterly, monthly, weekly, or daily)
 * @returns Formatted date string appropriate for the interval
 * @example
 * formatDateAxis("2024-03-15", "monthly") // => "2024-03"
 * formatDateAxis("2024-03-15", "yearly") // => "2024"
 */
export const formatDateAxis = (
  date: string,
  interval: ChartInterval,
): string => {
  // Strip time portion so ISO timestamps are treated as the plain calendar date
  const datePart = date.includes("T") ? date.split("T")[0] : date;
  const dateObj = parseISO(datePart);

  if (interval === "yearly") {
    return format(dateObj, "yyyy");
  }
  if (interval === "quarterly") {
    return format(dateObj, "yyyy-QQQ");
  }
  if (interval === "monthly") {
    return format(dateObj, "yyyy-MM");
  }
  if (interval === "weekly") {
    const week = getISOWeek(dateObj);
    const isoYear = getISOWeekYear(dateObj);
    return `${isoYear}-W${week.toString().padStart(2, "0")}`;
  }

  // Daily - YYYY-MM-DD
  return format(dateObj, "yyyy-MM-dd");
};
