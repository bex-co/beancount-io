import { resolveCurrencyBalance } from "./balance-util";

/** A charted point: an ISO date and its numeric value in the active currency. */
export type SeriesPoint = { date: string; value: number };

/** A `{ date, balance }` point as returned by balance-sheet / account-report
 * series (balance is a currency-keyed map). */
export type DateBalancePoint = {
  date: string;
  balance: Record<string, number | string>;
};

/** Robinhood-style time filter. Our series are monthly, so the windows are
 * month-based (a 1D/1W pill would be meaningless on monthly data). */
export type TimeRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

export const TIME_RANGES: TimeRange[] = ["1M", "3M", "6M", "YTD", "1Y", "ALL"];

/** Translation keys for each time-range pill's label. */
export const RANGE_LABEL_KEYS: Record<TimeRange, string> = {
  "1M": "range1M",
  "3M": "range3M",
  "6M": "range6M",
  YTD: "rangeYTD",
  "1Y": "range1Y",
  ALL: "rangeAll",
};

// Fixed month-window lengths. "YTD" (year-to-date) and "ALL" are handled
// specially in filterSeriesByRange, so they are excluded here.
const RANGE_MONTHS: Record<Exclude<TimeRange, "ALL" | "YTD">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

/**
 * Convert a `{ date, balance }` series (net worth, an account's balance
 * history, …) into a monthly `SeriesPoint[]` in the active currency: one
 * (most recent) point per month, ascending by date. Uses the shared
 * currency-balance resolver (active currency, USD fallback, string coercion).
 */
export function pointsToMonthlySeries(
  currency: string,
  points: ReadonlyArray<DateBalancePoint | null | undefined> | null | undefined,
): SeriesPoint[] {
  // Keep the most recent entry per month (input is chronological).
  const byMonth = new Map<string, SeriesPoint>();
  for (const point of points ?? []) {
    if (!point?.date) {
      continue;
    }
    byMonth.set(point.date.slice(0, 7), {
      date: point.date,
      value: resolveCurrencyBalance(point.balance, currency),
    });
  }

  return Array.from(byMonth.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Inclusive lower-bound "YYYY-MM" for a time range, anchored to a reference
 * month (typically the latest data point). "YTD" → January of that year;
 * "1M/3M/6M/1Y" → the reference month and the N-1 before it (plain month math,
 * stepping the year back on underflow). "ALL" returns "" (no lower bound).
 *
 * Shared so the Spending chart and its transaction list apply the same window.
 */
export function rangeStartMonth(
  range: TimeRange,
  referenceYearMonth: string,
): string {
  if (range === "ALL") {
    return "";
  }
  const [year, month] = referenceYearMonth.split("-").map(Number);
  if (range === "YTD") {
    return `${year}-01`;
  }
  const monthsBack = RANGE_MONTHS[range];
  let y = year;
  let m = month - (monthsBack - 1);
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Filter a monthly series to a time range. The window is anchored to the
 * **latest data point** (not "today") so a stale ledger still shows history
 * instead of an empty chart. "ALL" returns the whole series.
 */
export function filterSeriesByRange(
  series: SeriesPoint[],
  range: TimeRange,
): SeriesPoint[] {
  if (range === "ALL" || series.length === 0) {
    return series;
  }
  const cutoffKey = rangeStartMonth(
    range,
    series[series.length - 1].date.slice(0, 7),
  );
  return series.filter((point) => point.date.slice(0, 7) >= cutoffKey);
}

/**
 * Range filter for **balance (stock) series** — net worth, assets, liabilities,
 * an account's balance — where the window's first point is the baseline the
 * change is measured from. Our series are monthly, so a "1M" window holds
 * exactly one point and would render as a blank plot with a flat +0.00% change;
 * a window that can't draw a line borrows the point just before it, making 1M
 * read "last month → this month".
 *
 * Not for **flow series** (net profit, spending, income): each of their points
 * is that period's own total, and the reports' transaction lists are sliced by
 * `rangeStartMonth` — an extra month would put chart and list out of step.
 */
export function filterBalanceSeriesByRange(
  series: SeriesPoint[],
  range: TimeRange,
): SeriesPoint[] {
  const windowed = filterSeriesByRange(series, range);
  const startIndex = series.length - windowed.length;
  return windowed.length < 2 && startIndex > 0
    ? series.slice(startIndex - 1)
    : windowed;
}

/**
 * Convert a series to the `{ labels, numbers }` shape the charts consume,
 * with month labels ("MM"). Returns a single zero "no data" entry when empty.
 */
export function seriesToChartArray(
  series: SeriesPoint[],
  emptyLabel: string,
): { labels: string[]; numbers: number[] } {
  if (series.length === 0) {
    return { labels: [emptyLabel], numbers: [0] };
  }
  return {
    labels: series.map((point) => point.date.slice(5, 7)),
    numbers: series.map((point) => point.value),
  };
}

/**
 * Align income / expense / net monthly series onto ONE shared month axis for the
 * combined reports chart. The three series are filtered independently, so a month
 * present in one may be missing from another (e.g. a month with income but no
 * expenses); we union every month key ("YYYY-MM"), sort ascending, and 0-fill any
 * series that lacks a month. Returns the unique `months` keys plus the three
 * aligned number arrays, each the same length as `months`.
 *
 * `months` are the full "YYYY-MM" keys, NOT "MM": the chart uses them as its x
 * identity so a span crossing a year boundary (e.g. two Julys) keeps a distinct
 * column per month instead of collapsing them. Display labels are derived from the
 * key downstream (`t(month.slice(5, 7))`).
 *
 * Callers pass series already sign-corrected for display (income negated to
 * positive); this only aligns, it does not touch signs.
 */
export function alignMonthlySeries(input: {
  income: SeriesPoint[];
  expense: SeriesPoint[];
  net: SeriesPoint[];
}): { months: string[]; income: number[]; expense: number[]; net: number[] } {
  const keyOf = (point: SeriesPoint) => point.date.slice(0, 7);
  const months = Array.from(
    new Set([...input.income, ...input.expense, ...input.net].map(keyOf)),
  ).sort();
  const alignTo = (series: SeriesPoint[]) => {
    const byMonth = new Map(series.map((point) => [keyOf(point), point.value]));
    return months.map((month) => byMonth.get(month) ?? 0);
  };
  return {
    months,
    income: alignTo(input.income),
    expense: alignTo(input.expense),
    net: alignTo(input.net),
  };
}
