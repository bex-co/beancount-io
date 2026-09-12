/**
 * Ranking for the Home budget panel. The panel has room for a few rows, so it
 * shows the budgets closest to (or past) their limit rather than the first few
 * alphabetically — the ones worth knowing about before you spend again.
 */
import { dropRoot } from "../../../common/account-util";
import { formatMoneyWithCurrency } from "../../../common/number-utils";
import {
  budgetDirection,
  calculateBudgetForInterval,
} from "../../budget-screen/selectors/budget-selectors";
import type { BudgetGroup } from "../../budget-screen/selectors/budget-selectors";
import { selectBudgetCardStats } from "../../budget-screen/selectors/select-budget-card-stats";

export type BudgetPanelInput = {
  group: BudgetGroup;
  /** Actual activity for the current period, or null when it hasn't loaded. */
  actual: number | null;
  /** Last day of the period the actual covers. */
  periodEnd: string;
};

export type BudgetPanelRow = {
  account: string;
  shortAccount: string;
  currency: string;
  /** Budget for the current period, as a magnitude. */
  budget: number;
  /** Actual for the same period, sign-corrected to match. */
  actual: number;
  /** Spend as a percentage of budget, clamped at 0; 0 with nothing to divide by. */
  progressPercent: number;
  /** True when this budget is on the good side of its target. */
  favorable: boolean;
};

export function selectBudgetPanelRows(
  inputs: BudgetPanelInput[],
  limit: number,
): BudgetPanelRow[] {
  const rows = inputs.map(({ group, actual, periodEnd }) => {
    // Reuse the card's derivation so the two surfaces can't drift on the
    // favorability rules. It reads a series, so hand it the single period the
    // panel cares about, sign-corrected the way the card's series already is.
    const direction = budgetDirection(group.value);
    const stats = selectBudgetCardStats(group, [
      {
        date: periodEnd,
        actual: (actual ?? 0) * direction,
        budget:
          calculateBudgetForInterval(
            periodEnd,
            group.interval,
            group.budgetHistory,
          ) * direction,
      },
    ]);

    return {
      account: group.account,
      shortAccount: dropRoot(group.account),
      currency: group.currency,
      budget: stats.budget,
      actual: stats.actual ?? 0,
      progressPercent: stats.progressPercent ?? 0,
      favorable: stats.favorable,
    };
  });

  // Highest utilization first; ties break on account so the order is stable
  // between renders rather than depending on query completion order.
  return rows
    .sort(
      (a, b) =>
        b.progressPercent - a.progressPercent ||
        a.account.localeCompare(b.account),
    )
    .slice(0, limit);
}

/**
 * What a panel row announces beyond its account name.
 *
 * The row is one button wrapping the amounts and the meter, so an
 * `accessibilityLabel` on it collapses the subtree and hides every number a
 * sighted user reads. The label stays the account; this goes in
 * `accessibilityValue.text`, which VoiceOver speaks after the label — so it
 * repeats neither the account nor anything the label already says.
 *
 * Pure and string-only: the same `formatMoneyWithCurrency` the row renders, so
 * the spoken amounts cannot drift from the visible ones.
 */
export function budgetPanelRowAccessibilityValue(
  row: BudgetPanelRow,
  t: (key: string, options?: Record<string, string | number>) => string,
): string {
  return t("budgetPanelRowValue", {
    actual: formatMoneyWithCurrency(row.actual, row.currency),
    budget: formatMoneyWithCurrency(row.budget, row.currency),
    // Whole percent: a spoken "73.4166 percent" is noise, and the meter it
    // describes is a bar, not a readout.
    percent: Math.round(row.progressPercent),
    status: t(row.favorable ? "budgetBelowTarget" : "budgetAboveTarget"),
  });
}
