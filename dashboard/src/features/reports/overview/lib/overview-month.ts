import {
  type IntervalDataSeries,
  getFilteredDefaultIntervalDate,
  getIntervalDates,
  getLatestActiveIntervalDate,
  resolveDataThrough,
  settledOpeningMonth,
} from "./overview-utils";

/*
 * Which month the Overview opens on, as plain functions: the page's hooks and
 * the route loader both decide it, and must agree, or the loader would read
 * the balances of a month the page does not show.
 */

/**
 * The last day the ledger's data covers, from the newest-transactions read:
 * its newest entry, capped at today.
 */
export function dataThroughOf(entries: unknown, today: string): string {
  const newest = (Array.isArray(entries) ? entries : [])
    .map((entry: { date?: unknown } | null) =>
      typeof entry?.date === "string" ? entry.date : "",
    )
    .reduce((latest, date) => (date > latest ? date : latest), "");
  return resolveDataThrough(newest || null, today);
}

export function dateForOverviewMonth(
  dates: string[],
  month: string | undefined,
) {
  return dates.find((date) => date.slice(0, 7) === month);
}

/**
 * The month the Overview opens on: the latest one (under a filter, the latest
 * the filter reaches; for a public reader, the latest with activity), except
 * that a ledger which stopped part-way through its last month opens on the
 * last one it finished. Empty when there is no month.
 */
export function openingMonth({
  income,
  expenses,
  preferActiveMonth,
  hasFilters,
  dataThrough,
  today,
  dates = getIntervalDates(income, expenses),
  month,
}: {
  income: IntervalDataSeries;
  expenses: IntervalDataSeries;
  preferActiveMonth: boolean;
  hasFilters: boolean;
  dataThrough: string;
  today: string;
  /** The months of `income` and `expenses`, when already at hand. */
  dates?: string[];
  month?: string;
}): string {
  const requestedDate = dateForOverviewMonth(dates, month);
  if (requestedDate) return requestedDate;

  const latest = hasFilters
    ? (getFilteredDefaultIntervalDate(income, expenses) ?? "")
    : ((preferActiveMonth
        ? getLatestActiveIntervalDate(income, expenses)
        : undefined) ??
      dates.at(-1) ??
      "");
  return settledOpeningMonth(dates, latest, dataThrough, today);
}

/**
 * A month before the one the data ends in is history: Financial position
 * reads its balances again at that month's close, rather than the latest.
 */
export function isPastMonth(selectedDate: string, dataThrough: string) {
  return (
    selectedDate !== "" && selectedDate.slice(0, 7) < dataThrough.slice(0, 7)
  );
}
