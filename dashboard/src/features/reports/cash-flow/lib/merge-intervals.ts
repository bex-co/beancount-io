import type { IntervalAccountChanges } from "./model";

/**
 * Minimal shape of a getLedgerIntervalTotals item: a date plus per-account
 * changes (GraphQL types accountBalances as Record<string, unknown>).
 */
export interface IntervalTotalsLike {
  date: string;
  accountBalances: Record<string, unknown>;
}

/**
 * Merge the per-root interval-totals series (Income/Expenses/Assets/
 * Liabilities/Equity) into one IntervalAccountChanges[] for
 * buildCashFlowStatement. Defensive: groups by date without assuming the
 * series share ordering or date sets, shallow-merges the accountBalances maps
 * per date (account names from different roots never collide), and sorts by
 * date ascending.
 */
export function mergeIntervalAccountChanges(
  ...series: IntervalTotalsLike[][]
): IntervalAccountChanges[] {
  const byDate = new Map<string, Record<string, Record<string, unknown>>>();

  series.forEach((points) => {
    points.forEach((point) => {
      const merged = byDate.get(point.date) ?? {};
      Object.assign(
        merged,
        point.accountBalances as Record<string, Record<string, unknown>>,
      );
      byDate.set(point.date, merged);
    });
  });

  return [...byDate.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([date, accountChanges]) => ({ date, accountChanges }));
}
