import { useMemo } from "react";
import { useGetLedgerIntervalTotalsQuery } from "@/generated-graphql/graphql";
import { resolveCurrencyBalance } from "@/common/balance-util";
import {
  budgetForInterval,
  prepareBudgetHistory,
  type BudgetGroup,
} from "@/screens/budget-screen/selectors/budget-selectors";
import type { BudgetSeriesPoint } from "@/screens/budget-screen/selectors/select-budget-card-stats";

/**
 * Budget compares raw account activity, so it asks fava for `units` rather than
 * the `at_cost` valuation the balance charts use — a budget is written in one
 * currency and measured against postings in that same currency.
 */
const BUDGET_CONVERSION = "units";

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
    conversion: BUDGET_CONVERSION,
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
}: {
  ledgerId: string;
  group: BudgetGroup;
  currency: string;
  time?: string;
  direction: 1 | -1;
}) {
  const { data, loading, error } = useGetLedgerIntervalTotalsQuery({
    variables: budgetTotalsVariables({ ledgerId, group, time }),
    fetchPolicy: "cache-first",
  });

  const series: BudgetSeriesPoint[] = useMemo(() => {
    const items = data?.getLedgerIntervalTotals ?? [];
    // Prepared once per group: `budgetForInterval` runs per charted period, and
    // the `all` span can return a hundred of them.
    const history = prepareBudgetHistory(group.budgetHistory);
    return items.map((item) => ({
      date: item.date,
      actual: resolveCurrencyBalance(item.balance, currency) * direction,
      budget: budgetForInterval(item.date, group.interval, history) * direction,
    }));
  }, [data, currency, direction, group.interval, group.budgetHistory]);

  return { series, loading, error };
}
