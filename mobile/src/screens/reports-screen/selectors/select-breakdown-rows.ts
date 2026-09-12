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
 * `otherAccount` defaults to `OTHER_ACCOUNT`; the Sankey passes distinct ids so
 * the income and expense tails do not collide as one node.
 *
 * Input is assumed already sorted by magnitude descending (as
 * `selectRangedAccountTree` returns), so the head is the largest `n`.
 */
export function topNWithOther(
  items: AccountNode[],
  n: number,
  otherLabel: string,
  otherAccount: string = OTHER_ACCOUNT,
): AccountNode[] {
  if (items.length <= n + 1) {
    return items;
  }
  const head = items.slice(0, n);
  const rest = items.slice(n);
  const value = rest.reduce((sum, row) => sum + row.value, 0);
  return [
    ...head,
    { account: otherAccount, name: otherLabel, value, children: rest },
  ];
}

/**
 * What an expandable breakdown row announces *besides* its account name.
 *
 * An expandable row is a `TouchableOpacity` labelled with the account name, and
 * a label replaces its subtree — so the amount and the share percentage, both
 * descendants, drop out of the accessibility tree. Published as the row's
 * `accessibilityValue` instead, which is read after the label rather than
 * replacing it. Leaf rows keep their plain `View` and need none of this.
 *
 * `percent` is `null` for a sub-account row, which draws no bar and therefore
 * has no share to speak. Pure (`t` injected, `amountText` pre-formatted) so the
 * wording is unit-testable.
 */
export function breakdownRowAccessibilityValue(
  amountText: string,
  percent: number | null,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (percent === null) return amountText;
  return t("breakdownRowShare", {
    amount: amountText,
    // Rounded to match the visible % label exactly — two different numbers for
    // one bar is worse than none.
    percent: Math.round(percent),
  });
}
