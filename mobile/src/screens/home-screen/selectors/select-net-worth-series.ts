import { HomeChartsQuery } from "@/generated-graphql/graphql";

export type SeriesPoint = { date: string; value: number };

/** Robinhood-style time filter. Our net-worth data is monthly, so the pill set
 * is month-window based (a 1D/1W pill would be meaningless on monthly data). */
export type TimeRange = "3M" | "6M" | "1Y" | "ALL";

export const TIME_RANGES: TimeRange[] = ["3M", "6M", "1Y", "ALL"];

const RANGE_MONTHS: Record<Exclude<TimeRange, "ALL">, number> = {
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

/**
 * Full monthly net-worth series in the active currency, deduplicated to one
 * (most recent) point per month and sorted ascending by date. Unlike
 * `selectNetWorthArray` this keeps the entire history so the time-range pills
 * have something to filter.
 */
export function selectNetWorthSeries(
  currency: string,
  data?: HomeChartsQuery,
): SeriesPoint[] {
  const chartData = data?.homeCharts?.data.find((n) => n.label === "Net Worth");
  const points = chartData?.data ?? [];

  // Keep the most recent entry per month (input is chronological).
  const byMonth = new Map<string, SeriesPoint>();
  for (const point of points) {
    if (!point?.date) {
      continue;
    }
    const month = point.date.slice(0, 7);
    const raw = point.balance?.[currency];
    const value = Number(raw ?? 0);
    byMonth.set(month, { date: point.date, value: isNaN(value) ? 0 : value });
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
  const monthsBack = RANGE_MONTHS[range];
  const [latestYear, latestMonth] = series[series.length - 1].date
    .slice(0, 7)
    .split("-")
    .map(Number);
  // First month of the inclusive window (e.g. 3M → latest month and the 2 before),
  // stepping the year back on underflow — plain month math, no Date quirks.
  let year = latestYear;
  let month = latestMonth - (monthsBack - 1);
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  const cutoffKey = `${year}-${String(month).padStart(2, "0")}`;
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
