import { useCallback, useEffect, useMemo, useState } from "react";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import {
  GetLedgerIntervalTotalsDocument,
  QueryShellDocument,
  type GetLedgerIntervalTotalsQuery,
  type GetLedgerIntervalTotalsQueryVariables,
} from "@/generated-graphql/graphql";
import { resolveCurrencyBalance } from "@/common/balance-util";
import { notInTotalOf } from "@/common/balance-display";
import { useToday } from "@/common/hooks/use-today";
import { mapInBatches } from "@/common/map-in-batches";
import { ledgerRevisionVar } from "@/common/apollo/invalidate-ledger";
import { budgetTotalsVariables } from "@/screens/budget-screen/hooks/use-budget-actuals";
import {
  currentIntervalItem,
  currentPeriodRange,
  type BudgetGroup,
} from "@/screens/budget-screen/selectors/budget-selectors";
import {
  budgetPanelWindow,
  timeWindowStart,
} from "@/screens/budget-screen/selectors/budget-labels";
import {
  hasScheduledRows,
  scheduledThisMonthBql,
} from "@/screens/home-screen/selectors/scheduled-this-month";
import {
  settleBudgetPanel,
  type BudgetPanelRow,
} from "@/screens/home-screen/selectors/select-budget-panel";

/** Rows the panel displays. */
const BUDGET_PANEL_ROWS = 3;

/**
 * How many budgets the panel prices at once. Ranking by utilization needs an
 * actual per budget, one query per group; every budget is priced, in batches
 * of this size. Pricing only the first twelve alphabetically left a 250%
 * budget later in the alphabet off the panel (w21/165). The queries are cache
 * hits once /budget has loaded.
 *
 * TODO: this is a client-side stand-in for a missing server capability —
 * budgets returned with their current-period actuals in one request. With that,
 * the panel ranks the whole set in a single round-trip.
 */
const BUDGET_PANEL_BATCH = 12;

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
}): {
  rows: BudgetPanelRow[];
  loading: boolean;
  /** An actuals read failed with nothing cached: no row can say what was spent. */
  failed: boolean;
  retry: () => void;
} {
  const client = useApolloClient();
  // The day the panel measures against, advanced at midnight: read once at
  // mount, the row stayed on last month with the app left open overnight and
  // its prorated budget lagged a day (w21/233).
  const today = useToday();
  // These are one-off `client.query` reads, not observable queries, so a write
  // elsewhere in the app cannot reach them: `groupsKey` only changes when the
  // budget *directives* do, and a new transaction leaves those untouched.
  // Re-run on every ledger write so the actuals track spending.
  const ledgerRevision = useReactiveVar(ledgerRevisionVar);
  const [rows, setRows] = useState<BudgetPanelRow[]>([]);
  // The ledger `rows` were read for. The tabs stay mounted, so a switch to a
  // ledger with cached budgets rendered the previous ledger's rows until the
  // new reads landed; rows of another ledger read as none, still loading
  // (w21/381).
  const [rowsLedger, setRowsLedger] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Identity of the budget set, so the effect re-runs when budgets change but
  // not on every re-render of an unchanged list.
  const groupsKey = useMemo(
    () =>
      groups
        .map(
          (group) =>
            `${group.account}::${group.currency}::${group.amount}::${group.interval}`,
        )
        .join("|"),
    [groups],
  );

  useEffect(() => {
    let cancelled = false;

    if (!ledgerId || groups.length === 0) {
      setRows([]);
      setRowsLedger(ledgerId ?? null);
      setFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailed(false);

    // One window all month, so the next day offline still finds the cached
    // actuals; it no longer shares the page's year-to-date result, which
    // ends on today and changes daily (w21/184).
    const time = budgetPanelWindow(today);

    // The month-long window holds anything pre-entered for later this month,
    // which is not spent yet. When there is any, the period in progress is read
    // to today instead; otherwise the stable window is kept for the cache
    // (w21/337). A failed check reads as none.
    const scheduledCheck = client
      .query({
        query: QueryShellDocument,
        variables: { ledgerId, query: scheduledThisMonthBql(today) },
        fetchPolicy: "network-only",
      })
      .then(({ data }) => hasScheduledRows(data?.queryShell?.table))
      .catch(() => false);

    scheduledCheck
      .then((scheduled) =>
        mapInBatches(
          groups,
          BUDGET_PANEL_BATCH,
          async (group) => {
            const { end, start } = currentPeriodRange(group.interval, today);
            const totals = (
              fetchPolicy: "network-only" | "cache-only",
              window: string = time,
            ) =>
              client
                .query<
                  GetLedgerIntervalTotalsQuery,
                  GetLedgerIntervalTotalsQueryVariables
                >({
                  query: GetLedgerIntervalTotalsDocument,
                  variables: budgetTotalsVariables({
                    ledgerId,
                    group,
                    time: window,
                  }),
                  fetchPolicy,
                })
                .then(({ data }) => data?.getLedgerIntervalTotals ?? []);
            // The period in progress, to today, but never before the window's own
            // start (a weekly period spanning New Year's).
            const windowStart = timeWindowStart(time, today) ?? start;
            const toToday = `${start > windowStart ? start : windowStart} - ${today}`;
            // Current totals first: the persisted cache holds the last session's
            // spending (w21/006). Offline, that cache is still better than nothing.
            const items = await (
              scheduled
                ? totals("network-only", toToday).catch(() => null)
                : Promise.resolve(null)
            )
              .then((read) => read ?? totals("network-only"))
              .catch(() => totals("cache-only"))
              // Nothing fetched and nothing cached: the row would read "$0.00 of
              // $500.00", a claim about spending a failed read cannot back
              // (w21/080).
              .catch(() => null);

            // The interval in progress, not the window's last: the month-long
            // window ends on rows for weeks and days that have not begun
            // (w21/364).
            const last = items ? currentIntervalItem(items, today) : null;
            return {
              input: {
                group,
                periodEnd: end,
                actual: last
                  ? resolveCurrencyBalance(last.balance, group.currency)
                  : null,
                notInTotal: last
                  ? notInTotalOf(last.balance, group.currency)
                  : [],
              },
              failed: items === null,
            };
          },
          // A new run (another ledger, a write) supersedes this one: stop between
          // batches instead of firing every remaining read (w21/336).
          () => cancelled,
        ),
      )
      .then((results) => {
        if (cancelled) {
          return;
        }
        const settled = settleBudgetPanel(
          results,
          BUDGET_PANEL_ROWS,
          today,
          // The panel's current period can be the window's clipped first one
          // (a weekly budget in early January).
          timeWindowStart(time, today),
        );
        setRows(settled.rows);
        setRowsLedger(ledgerId);
        setFailed(settled.failed);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    client,
    ledgerId,
    groupsKey,
    refreshSignal,
    ledgerRevision,
    attempt,
    today,
  ]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const current = rowsLedger === (ledgerId ?? null);
  return {
    rows: current ? rows : [],
    loading: loading || !current,
    failed: current && failed,
    retry,
  };
}
