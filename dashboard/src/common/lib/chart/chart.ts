import numbro from "numbro";

/** Significant digits kept for a tick smaller than one. */
const FRACTIONAL_SIGNIFICANT_DIGITS = 2;

/** Below this magnitude, even two significant digits are unreadable inline. */
const EXPONENTIAL_BELOW = 1e-4;

/**
 * Format a number for Y-axis display in charts
 * Converts numbers to abbreviated format (e.g., 1000 => "1.0k")
 *
 * Abbreviate at full unit thresholds and show one decimal place. Fractional
 * ticks keep two significant digits so nearby values such as 0.003 and 0.006
 * remain distinct. Zero reads "0.0".
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

  return numbro(numberString).format({
    average: true,
    mantissa: 1,
    lowPrecision: false,
  });
};

import {
  parseISO,
  format,
  getISOWeek,
  getISOWeekYear,
  isValid,
} from "date-fns";
import type { ChartInterval } from "@/common/types/chart";
import { isoDateToCalendar } from "@/common/components/ui/date-picker-utils";

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
  // A civil day, held in UTC: the local midnight of a day the browser's zone
  // skipped rolls into the next, which labeled Kiritimati's 1994-12-31 point
  // January 1995 (w4/1028). Other date shapes parse as before.
  const civil = isoDateToCalendar(datePart);
  const dateObj = isValid(civil) ? civil : parseISO(datePart);

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
