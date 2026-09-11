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
