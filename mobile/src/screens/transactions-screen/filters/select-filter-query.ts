import { getFormatDate } from "../../../common/format-util";
import { TransactionFilters } from "./types";

/** An inclusive `YYYY-MM-DD` window. */
export type DateRange = { start: string; end: string };

/** The `JournalQueryInput` fields the filter modal controls. */
export type FilterQuery = {
  transactionSubtypes?: string[];
  time?: string;
  account?: string;
};

const monthsBack = (today: Date, months: number): Date => {
  const date = new Date(today.getTime());
  const day = date.getDate();
  date.setMonth(date.getMonth() - months);
  // setMonth overflows when the target month is shorter (Mar 31 → Mar 3);
  // clamp back to that month's last day.
  if (date.getDate() !== day) {
    date.setDate(0);
  }
  return date;
};

/**
 * The window a filter asks for, resolved against `today`.
 *
 * @param filters - Current filter state
 * @param today - The day to anchor relative ranges to
 * @returns The window, or null when the range is unbounded or incomplete
 */
export const resolveDateRange = (
  filters: TransactionFilters,
  today: Date,
): DateRange | null => {
  const end = getFormatDate(today);

  switch (filters.range) {
    case "1M":
      return { start: getFormatDate(monthsBack(today, 1)), end };
    case "3M":
      return { start: getFormatDate(monthsBack(today, 3)), end };
    case "YTD":
      return { start: `${today.getFullYear()}-01-01`, end };
    case "custom":
      // A half-filled custom range filters nothing — both ends are required.
      return filters.startDate && filters.endDate
        ? { start: filters.startDate, end: filters.endDate }
        : null;
    case "all":
    default:
      return null;
  }
};

/**
 * Renders a window into the backend's `time` expression.
 *
 * The ledger API is Fava-derived (it shares `filter` / `time` / `conversion`),
 * so the range is written the way Fava spells one: `2026-01-01 - 2026-07-22`.
 * Every caller goes through here, so a different server dialect is a one-line
 * change.
 */
export const formatTimeFilter = (range: DateRange): string =>
  `${range.start} - ${range.end}`;

/**
 * Translates filter state into query fields, omitting whatever is inactive so
 * the variables stay identical to an unfiltered query when nothing is set.
 */
export const toFilterQuery = (
  filters: TransactionFilters,
  today: Date,
): FilterQuery => {
  const query: FilterQuery = {};

  if (filters.statuses.length > 0) {
    query.transactionSubtypes = [...filters.statuses];
  }

  const range = resolveDateRange(filters, today);
  if (range) {
    query.time = formatTimeFilter(range);
  }

  if (filters.account) {
    query.account = filters.account;
  }

  return query;
};

/**
 * How many filter groups are active — drives the dot on the filter button. A
 * custom range missing one of its ends counts for nothing, matching what the
 * query actually does.
 */
export const countActiveFilters = (
  filters: TransactionFilters,
  today: Date,
): number => {
  let count = 0;
  if (filters.statuses.length > 0) count += 1;
  if (resolveDateRange(filters, today)) count += 1;
  if (filters.account) count += 1;
  return count;
};
