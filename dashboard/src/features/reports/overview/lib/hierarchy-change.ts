import {
  negateDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import { parseConcreteTimeFilter } from "@/features/reports/export/reporting-period";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { toExactAmount } from "./unit-amounts";

type Balance = Record<string, unknown> | null | undefined;

/** `current − previous` per unit, as exact decimals, without the zeros. */
function subtractBalance(current: Balance, previous: Balance) {
  const result: Record<string, string> = {};
  const units = new Set([
    ...Object.keys(current ?? {}),
    ...Object.keys(previous ?? {}),
  ]);
  for (const unit of units) {
    const now = toExactAmount(current?.[unit]) ?? "0";
    const before = toExactAmount(previous?.[unit]) ?? "0";
    const change = sumDecimalNumbers([now, negateDecimalNumber(before)]);
    if (Number(change) !== 0) result[unit] = change;
  }
  return result;
}

/**
 * How a balance tree moved between two closing dates: every account's own
 * balance at the later date minus its own balance at the earlier one, over
 * the accounts either date holds (one sold out of shows its whole outflow).
 *
 * A balance-sheet read under a time filter closes the period with everything
 * before it carried in, so a month's Assets tree is the month-end holdings,
 * not the month's purchases. The difference from the day before the month
 * began is what the month itself moved.
 */
export function hierarchyChange(
  current: SerializableTreeNode | null | undefined,
  previous: SerializableTreeNode | null | undefined,
): SerializableTreeNode | undefined {
  const base = current ?? previous;
  if (!base) return undefined;
  const children = new Map<
    string,
    [SerializableTreeNode | undefined, SerializableTreeNode | undefined]
  >();
  for (const child of (current?.children ?? []) as SerializableTreeNode[]) {
    if (child?.account) children.set(child.account, [child, undefined]);
  }
  for (const child of (previous?.children ?? []) as SerializableTreeNode[]) {
    if (!child?.account) continue;
    children.set(child.account, [children.get(child.account)?.[0], child]);
  }
  return {
    ...base,
    balance: subtractBalance(current?.balance, previous?.balance),
    // Only the change is meaningful here; nothing reads a rolled-up total.
    balanceChildren: {},
    children: [...children.values()]
      .map(([now, before]) => hierarchyChange(now, before))
      .filter((child): child is SerializableTreeNode => Boolean(child)),
  };
}

/**
 * The day before a concrete time filter begins (`2017-09` → `2017-08-31`),
 * as a time filter of that one day, whose balance-sheet read closes there.
 * Null for a filter without a concrete start.
 */
export function dayBeforeTimeFilter(time: string): string | null {
  const start = parseConcreteTimeFilter(time)?.startDate;
  if (!start) return null;
  const day = new Date(`${start}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) return null;
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}
