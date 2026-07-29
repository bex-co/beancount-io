import numbro from "numbro";

/**
 * Format a number for Y-axis display in charts
 * Converts numbers to abbreviated format (e.g., 1000 => "1.0k")
 * @param numberString - The number to format (as string or number)
 * @returns Formatted number with abbreviation
 * @example
 * formatYAxisNumber(1000) // => "1.0k"
 * formatYAxisNumber(1500000) // => "1.5m"
 */
export const formatYAxisNumber = (numberString: string | number): string => {
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
