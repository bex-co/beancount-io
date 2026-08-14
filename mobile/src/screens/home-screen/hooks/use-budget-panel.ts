import { useEffect, useMemo, useState } from "react";
import { useApolloClient } from "@apollo/client";
import {
  GetLedgerIntervalTotalsDocument,
  type GetLedgerIntervalTotalsQuery,
  type GetLedgerIntervalTotalsQueryVariables,
} from "@/generated-graphql/graphql";
import { resolveCurrencyBalance } from "@/common/balance-util";
import { budgetTotalsVariables } from "@/screens/budget-screen/hooks/use-budget-actuals";
import {
  currentPeriodRange,
  type BudgetGroup,
} from "@/screens/budget-screen/selectors/budget-selectors";
import {
  DEFAULT_BUDGET_SPAN,
  timeSpanToFilter,
} from "@/screens/budget-screen/selectors/budget-labels";
import {
  selectBudgetPanelRows,
  type BudgetPanelRow,
} from "@/screens/home-screen/selectors/select-budget-panel";

/** Rows the panel displays. */
export const BUDGET_PANEL_ROWS = 3;

/**
 * Ceiling on how many budgets the panel will price before ranking. Ranking by
 * utilization needs an actual per budget, so the cost is one query per group;
 * this bounds it for ledgers with a very large budget set, at the cost of
 * ranking only the first N accounts alphabetically. Typical ledgers hold far
 * fewer than this, and the queries are cache hits once /budget has loaded.
 *
 * TODO: this is a client-side stand-in for a missing server capability —
 * budgets returned with their current-period actuals in one request. With that,
 * the panel ranks the whole set in a single round-trip and the cap goes away.
 */
export const BUDGET_PANEL_QUERY_CAP = 12;

/**
 * Fetches current-period actuals for the ledger's budgets and ranks them.
 *
 * The number of budgets is dynamic, so this issues client queries in an effect
 * rather than calling a hook per group. `cache-first` means the page and the
 * panel share results for any budget they both show.
 */
export function useBudgetPanel({
  ledgerId,
  groups,
  refreshSignal = 0,
}: {
  ledgerId?: string;
  groups: BudgetGroup[];
  refreshSignal?: number;
}): { rows: BudgetPanelRow[]; loading: boolean } {
  const client = useApolloClient();
  const [rows, setRows] = useState<BudgetPanelRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Identity of the budget set, so the effect re-runs when budgets change but
  // not on every re-render of an unchanged list.
  const groupsKey = useMemo(
    () =>
      groups
        .map((group) => `${group.account}::${group.currency}::${group.amount}`)
        .join("|"),
    [groups],
  );

  useEffect(() => {
    let cancelled = false;

    if (!ledgerId || groups.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const priced = groups.slice(0, BUDGET_PANEL_QUERY_CAP);

    // Deliberately the span the page opens on, not this budget's own current
    // period: identical variables mean one cached result serves the panel and
    // the page instead of each fetching its own copy of every budget.
    const time = timeSpanToFilter(DEFAULT_BUDGET_SPAN);

    Promise.all(
      priced.map(async (group) => {
        const { end } = currentPeriodRange(group.interval);
        const items = await client
          .query<
            GetLedgerIntervalTotalsQuery,
            GetLedgerIntervalTotalsQueryVariables
          >({
            query: GetLedgerIntervalTotalsDocument,
            variables: budgetTotalsVariables({ ledgerId, group, time }),
            fetchPolicy: "cache-first",
          })
          .then(({ data }) => data?.getLedgerIntervalTotals ?? [])
          // One unreachable account shouldn't blank the whole panel; it ranks
          // as unspent and the page surfaces the error in full.
          .catch(() => []);

        // The last interval in the window is the one in progress.
        const last = items.length > 0 ? items[items.length - 1] : null;
        return {
          group,
          periodEnd: end,
          actual: last
            ? resolveCurrencyBalance(last.balance, group.currency)
            : null,
        };
      }),
    ).then((inputs) => {
      if (cancelled) {
        return;
      }
      setRows(selectBudgetPanelRows(inputs, BUDGET_PANEL_ROWS));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, ledgerId, groupsKey, refreshSignal]);

  return { rows, loading };
}
