/**
 * Derives the numbers a budget card shows from a group and its actuals series.
 * Pure so the jest-lite runner can exercise the favorability rules, which are
 * the easiest part of budget to get subtly wrong (income budgets invert them).
 */
import {
  budgetDirection,
  isFavorableVariance,
  varianceStatus,
  type BudgetGroup,
  type VarianceStatus,
} from "./budget-selectors";

export type BudgetSeriesPoint = {
  date: string;
  /** Actual activity, sign-corrected so expenses and income both read positive. */
  actual: number;
  /** Prorated budget for the same period, same sign convention. */
  budget: number;
};

export type BudgetCardStats = {
  /** Budget for the latest charted period, as a magnitude. */
  budget: number;
  /** Actual activity for that period, or null when the series is empty. */
  actual: number | null;
  /** actual − budget; positive means above target. */
  variance: number | null;
  status: VarianceStatus | null;
  /** True when the variance falls on the good side for this budget's kind. */
  favorable: boolean;
  /** Spend as a percentage of budget, or null when there is nothing to divide by. */
  progressPercent: number | null;
};

/**
 * Whether each charted period landed on the good side of its own budget. Same
 * rule as the card's status badge — money tolerance and income inversion
 * included — so a bar can't contradict the badge sitting above it.
 */
export function selectPointFavorability(
  series: BudgetSeriesPoint[],
  direction: 1 | -1,
): boolean[] {
  return series.map((point) =>
    isFavorableVariance(
      varianceStatus(point.actual - Math.abs(point.budget)),
      direction,
    ),
  );
}

export function selectBudgetCardStats(
  group: BudgetGroup,
  series: BudgetSeriesPoint[],
): BudgetCardStats {
  const direction = budgetDirection(group.value);
  const latest = series.length > 0 ? series[series.length - 1] : null;

  // The series already carries the budget that was in effect for each charted
  // period — not today's amount — so a mid-year raise doesn't retroactively
  // rewrite history. Falls back to the current amount when nothing is charted.
  const budget = latest ? Math.abs(latest.budget) : Math.abs(group.value);

  const actual =
    latest && Number.isFinite(latest.actual) ? latest.actual : null;
  const variance = actual === null ? null : actual - budget;
  const status = variance === null ? null : varianceStatus(variance);
  const favorable =
    status === null ? true : isFavorableVariance(status, direction);
  const progressPercent =
    actual === null || budget <= 0
      ? null
      : Math.max(0, (actual / budget) * 100);

  return { budget, actual, variance, status, favorable, progressPercent };
}
