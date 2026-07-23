import { AccountNode } from "@/components/account-list/select-account-list";

/** Synthetic account id for the folded "Other" bucket. */
export const OTHER_ACCOUNT = "__other__";

/**
 * Cap a ranked breakdown at `n` visible rows, folding the long tail into a single
 * synthetic "Other" row so a ledger with dozens of leaf categories doesn't render
 * as dozens of bars. The folded rows become the "Other" row's `children`, so
 * tapping it still reveals the tail.
 *
 * Passthrough when there would be at most one extra row (`items.length <= n + 1`):
 * bucketing a single leftover into "Other" only hides a row behind a tap for no
 * gain. `otherLabel` is injected (kept i18n-free so this stays a pure function).
 *
 * Input is assumed already sorted by magnitude descending (as
 * `selectRangedAccountTree` returns), so the head is the largest `n`.
 */
export function topNWithOther(
  items: AccountNode[],
  n: number,
  otherLabel: string,
): AccountNode[] {
  if (items.length <= n + 1) {
    return items;
  }
  const head = items.slice(0, n);
  const rest = items.slice(n);
  const value = rest.reduce((sum, row) => sum + row.value, 0);
  return [
    ...head,
    { account: OTHER_ACCOUNT, name: otherLabel, value, children: rest },
  ];
}
