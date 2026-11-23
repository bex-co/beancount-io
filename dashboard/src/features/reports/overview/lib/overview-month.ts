import {
  parseConcreteTimeFilter,
  type FiscalYearEnd,
} from "@/features/reports/export/reporting-period";
import {
  type IntervalDataSeries,
  getIntervalDates,
  getLatestActiveIntervalDate,
  isLedgerDormant,
  resolveDataThrough,
  resolveMovementTimeFilter,
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

  const begun = dates.filter((date) => date.slice(0, 7) <= today.slice(0, 7));
  if (begun.length === 0) return dates.at(-1) ?? "";

  // Scheduled entries can extend the series across months with no activity.
  // For a dormant ledger, start from where the completed activity stopped.
  const recorded = isLedgerDormant(dataThrough, today)
    ? begun.filter((date) => date.slice(0, 7) <= dataThrough.slice(0, 7))
    : begun;
  const available = recorded.length > 0 ? recorded : begun;
  const latest = available.at(-1)!;
  const active =
    hasFilters || preferActiveMonth
      ? getLatestActiveIntervalDate(income, expenses, latest)
      : undefined;
  return settledOpeningMonth(available, active ?? latest, dataThrough, today);
}

/**
 * The extra valuation needed when the selected period has its own cutoff.
 * A current month ends today or at the filter's earlier close. Historical
 * selections and explicitly selected future months use their own close.
 */
export function financialPositionPeriod({
  selectedDate,
  latestDate,
  dataThrough,
  today,
  time,
  fiscalYearEnd,
}: {
  selectedDate: string;
  latestDate?: string;
  dataThrough: string;
  today: string;
  time: string;
  fiscalYearEnd?: FiscalYearEnd;
}): { date: string; time: string } | undefined {
  if (!selectedDate) return;
  const month = selectedDate.slice(0, 7);
  const current = today.slice(0, 7);
  if (month === current) {
    const date = selectedDate < today ? selectedDate : today;
    const first = `${month}-01`;
    const range = parseConcreteTimeFilter(time, fiscalYearEnd);
    const start =
      range && range.startDate > first && range.startDate <= date
        ? range.startDate
        : first;
    return { date, time: `${start} - ${date}` };
  }
  if (
    month > current ||
    month < dataThrough.slice(0, 7) ||
    (latestDate && month < latestDate.slice(0, 7))
  ) {
    return {
      date: selectedDate,
      time: resolveMovementTimeFilter(selectedDate, time),
    };
  }
}
