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
  const [latestYear, latestMonth] = series[series.length - 1].date
    .slice(0, 7)
    .split("-")
    .map(Number);

  let cutoffKey: string;
  if (range === "YTD") {
    // Year-to-date: from January of the latest data point's year.
    cutoffKey = `${latestYear}-01`;
  } else {
    // First month of the inclusive window (e.g. 3M → latest month and the 2
    // before), stepping the year back on underflow — plain month math, no
    // Date quirks.
    const monthsBack = RANGE_MONTHS[range];
    let year = latestYear;
    let month = latestMonth - (monthsBack - 1);
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    cutoffKey = `${year}-${String(month).padStart(2, "0")}`;
  }
  return series.filter((point) => point.date.slice(0, 7) >= cutoffKey);
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
