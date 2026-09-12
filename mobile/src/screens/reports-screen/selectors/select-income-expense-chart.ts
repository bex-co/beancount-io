import {
  alignMonthlySeries,
  filterSeriesByRange,
  pointsToMonthlySeries,
  type DateBalancePoint,
  type TimeRange,
} from "../../../common/series-util";

type BalanceSeries =
  ReadonlyArray<DateBalancePoint | null | undefined> | null | undefined;

/**
 * The report's anchor month ("YYYY-MM"): the latest month any statement series
 * carries data for, i.e. the chart's right edge.
 *
 * `filterSeriesByRange` anchors each charted series to its own newest point, so
 * the chart as a whole ends at this month. The recent-transactions list windows
 * on the same value, which keeps it on the month the chart shows even when that
 * month's only activity is a transfer (no Income/Expenses posting of its own).
 * Returns null while the statement is unresolved.
 */
export function selectStatementAnchorMonth(
  ...series: BalanceSeries[]
): string | null {
  let latest: string | null = null;
  for (const points of series) {
    for (const point of points ?? []) {
      if (!point?.date) {
        continue;
      }
      const month = point.date.slice(0, 7);
      if (latest === null || month > latest) {
        latest = month;
      }
    }
  }
  return latest;
}

/**
 * Convert IncomeStatement series for the Reports combined chart.
 *
 * Accounting balances keep income and net profit as credits (negative). The
 * chart plots both as positive magnitudes for profitable months, so negate
 * those two series at this presentation boundary. Expenses stay as-is.
 */
export function selectIncomeExpenseChartSeries(
  currency: string,
  incomeData: BalanceSeries,
  expensesData: BalanceSeries,
  netProfitData: BalanceSeries,
  timeRange: TimeRange,
) {
  const income = pointsToMonthlySeries(currency, incomeData).map((point) => ({
    ...point,
    value: -point.value + 0,
  }));
  const expense = pointsToMonthlySeries(currency, expensesData);
  const net = pointsToMonthlySeries(currency, netProfitData).map((point) => ({
    ...point,
    value: -point.value + 0,
  }));
  return alignMonthlySeries({
    income: filterSeriesByRange(income, timeRange),
    expense: filterSeriesByRange(expense, timeRange),
    net: filterSeriesByRange(net, timeRange),
  });
}
