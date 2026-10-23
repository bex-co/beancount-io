import { useMemo } from "react";
import { useGetLedgerIntervalTotalsQuery } from "@/generated-graphql/graphql";
import {
  BALANCE_CONVERSION,
  resolveCurrencyBalance,
} from "@/common/balance-util";
import { notInTotalOf, type Holding } from "@/common/balance-display";
import { signed } from "@/screens/budget-screen/selectors/signed-holding";
import { getFormatDate } from "@/common/format-util";
import {
  budgetForInterval,
  allTimeThroughToday,
  budgetActualsState,
  currentPeriodKnown,
  currentPeriodRange,
  periodsBetween,
  periodsThrough,
  prepareBudgetHistory,
  type BudgetGroup,
} from "@/screens/budget-screen/selectors/budget-selectors";
import type { BudgetSeriesPoint } from "@/screens/budget-screen/selectors/select-budget-card-stats";
import { timeWindowStart } from "@/screens/budget-screen/selectors/budget-labels";

/**
 * Shared variables so the budget page and the Home panel land on the same
 * Apollo cache entry. That sharing depends on the two being byte-identical,
 * which is not something two hand-written copies can guarantee — same reason
 * `budgetJournalVariables` exists for the directives query.
 */
export function budgetTotalsVariables({
  ledgerId,
  group,
  time,
}: {
  ledgerId: string;
  group: BudgetGroup;
  time?: string;
}) {
  return {
    ledgerId,
    accountName: group.account,
    interval: group.interval.toLowerCase(),
    // At cost, as Spending and Reports read (w21/572): a budget is written in
    // one currency and measured against postings in that currency, and an
    // expense booked at cost (donated shares, 5 VOO {400.00 USD}) is that much
    // spent. Read in units it was "Actual $0.00 · Not in total: 5 VOO"
    // (w21/726). A posting with no cost basis keeps its currency and stays
    // "not in total" (w21/709).
    conversion: BALANCE_CONVERSION,
    time,
  };
}

/**
 * Per-interval actuals for one budget group, paired with the prorated budget
 * for each period. `getLedgerIntervalTotals` rolls sub-accounts into the parent
 * server-side, matching fava (and the dashboard): actuals include children,
 * budgets bind to the exact account.
 */
export function useBudgetActuals({
  ledgerId,
  group,
  currency,
  time,
  direction,
  endsOn,
}: {
  ledgerId: string;
  group: BudgetGroup;
  currency: string;
  time?: string;
  direction: 1 | -1;
  /** The last day the budget applies: the close date of its account. */
  endsOn?: string;
}) {
  // Actuals stop at today, so the budget they are measured against does too.
  const today = getFormatDate(new Date());
  const all = useGetLedgerIntervalTotalsQuery({
    variables: budgetTotalsVariables({ ledgerId, group, time }),
  });
  // All time runs to the last posting, even a future one, so its current period
  // is read again from its start to today, as a windowed range is (w21/168,
  // w21/332).
  const currentWindow = useGetLedgerIntervalTotalsQuery({
    variables: budgetTotalsVariables({
      ledgerId,
      group,
      time: `${currentPeriodRange(group.interval, today).start} - ${today}`,
    }),
    skip: time !== undefined,
  });
  const { data } = all;
  const loading = all.loading || (time === undefined && currentWindow.loading);
  const error =
    all.error ?? (time === undefined ? currentWindow.error : undefined);
  const currentData = currentWindow.data;

  const series: BudgetSeriesPoint[] = useMemo(() => {
    const fetched = data?.getLedgerIntervalTotals ?? [];
    const items =
      time === undefined
        ? allTimeThroughToday(
            fetched,
            currentData?.getLedgerIntervalTotals,
            group.interval,
            today,
          )
        : fetched;
    // Prepared once per group: `budgetForInterval` runs per charted period, and
    // the `all` span can return a hundred of them.
    const history = prepareBudgetHistory(group.budgetHistory);
    // And start where the window does: its first period is often partial.
    const windowStart = timeWindowStart(time, today);
    const point = (
      date: string,
      actual: number,
      notInTotal: Holding[] = [],
    ) => ({
      date,
      actual: actual * direction,
      notInTotal: notInTotal.map((holding) => signed(holding, direction)),
      budget:
        budgetForInterval(
          date,
          group.interval,
          history,
          today,
          windowStart,
          endsOn,
        ) * direction,
    });
    // All time lists only periods with postings, and the current period's row
    // follows them from further on: the empty periods between come back as
    // zeros (w21/010, w21/670).
    const points: BudgetSeriesPoint[] = [];
    items.forEach((item, index) => {
      const previous = items[index - 1];
      if (time === undefined && previous) {
        for (const date of periodsBetween(
          previous.date,
          group.interval,
          item.date,
        )) {
          points.push(point(date, 0));
        }
      }
      // Activity in another currency cannot join the actual: it is carried
      // beside it, so the card can say so (w21/709).
      points.push(
        point(
          item.date,
          resolveCurrencyBalance(item.balance, currency),
          notInTotalOf(item.balance, currency),
        ),
      );
    });
    // A windowed range ends today on the server. All time ends at the last
    // posting, so carry it on through today with the periods nothing was
    // spent in, as YTD and 1Y show them (w21/010).
    const last = items[items.length - 1];
    if (time === undefined && last && currentPeriodKnown(time, currentData)) {
      for (const date of periodsThrough(last.date, group.interval, today)) {
        points.push(point(date, 0));
      }
    }
    return points;
  }, [
    data,
    currentData,
    currency,
    direction,
    group.interval,
    group.budgetHistory,
    endsOn,
    time,
    today,
  ]);

  // Whether the series ends on a period whose figures are in; until then the
  // card shows no judged stats (w21/455).
  const state = budgetActualsState({ data, currentData, error, time });

  return {
    series,
    loading,
    error: state.error,
    stale: state.stale,
    settled: state.settled,
  };
}
