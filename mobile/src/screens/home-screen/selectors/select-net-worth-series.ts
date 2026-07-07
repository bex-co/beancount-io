import { HomeChartsQuery } from "@/generated-graphql/graphql";
import { SeriesPoint } from "../../../common/series-util";

// The generic monthly-series helpers (SeriesPoint, TimeRange, filterSeriesByRange,
// seriesToChartArray, pointsToMonthlySeries, …) now live in `@/common/series-util`;
// re-exported here so existing home-screen consumers keep their import path.
export * from "../../../common/series-util";

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
