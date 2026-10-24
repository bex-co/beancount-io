import {
  alignMonthlySeries,
  currentYearMonth,
  filterFlowSeriesByRange,
  flowAnchorMonth,
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
  currentMonth: string,
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
  // Never after the current month (w21/166).
  return latest === null ? null : flowAnchorMonth(latest, currentMonth);
}

/**
 * The month Reports' ranges end on when it is not the current one: a ledger
 * with nothing yet this month ends them on its latest month with entries
 * (w21/166), so Spending's "This month $0.00" opened onto August's spending
 * under the same "1M" with nothing to say so (w21/727). Null when the ranges
 * end this month, for "ALL", or before the statement has loaded.
 */
export function staleAnchorMonth(
  anchorMonth: string | null,
  currentMonth: string,
  range: string,
): string | null {
  if (range === "ALL" || anchorMonth === null || anchorMonth >= currentMonth) {
    return null;
  }
  // YTD starts this January: an anchor before it is outside the range, and
  // "Showing through December" sat over an empty report every January
  // (w21/890).
  if (range === "YTD" && anchorMonth < `${currentMonth.slice(0, 4)}-01`) {
    return null;
  }
  return anchorMonth;
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
  currentMonth: string = currentYearMonth(),
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
    income: filterFlowSeriesByRange(income, timeRange, currentMonth),
    expense: filterFlowSeriesByRange(expense, timeRange, currentMonth),
    net: filterFlowSeriesByRange(net, timeRange, currentMonth),
  });
}
