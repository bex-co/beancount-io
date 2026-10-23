/**
 * Derives the numbers a budget card shows from a group and its actuals series.
 * Pure so the jest-lite runner can exercise the favorability rules, which are
 * the easiest part of budget to get subtly wrong (income budgets invert them).
 */
import {
  groupDirection,
  statusScale,
  isFavorableVariance,
  varianceStatus,
  type BudgetGroup,
  type VarianceStatus,
} from "./budget-selectors";
import type { Holding } from "../../../common/balance-display";

export type BudgetSeriesPoint = {
  date: string;
  /** Actual activity, sign-corrected so expenses and income both read positive. */
  actual: number;
  /** Prorated budget for the same period, same sign convention. */
  budget: number;
  /**
   * The account's activity in other currencies, which `actual` cannot include,
   * same sign convention (w21/709).
   */
  notInTotal?: Holding[];
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
  /**
   * The first directive's date when the latest period ended before it: no
   * target existed yet, so nothing is judged (w21/101).
   */
  startsOn: string | null;
  /** The latest period's activity in other currencies, left out of `actual`. */
  notInTotal: Holding[];
  /**
   * True when those amounts could turn the status around, so none is given:
   * neither green nor red (w21/709).
   */
  unjudged: boolean;
};

/**
 * The status that stands with activity in other currencies left out of the
 * actual. A budget spending €250 beside $0.00 read a green "Below target"
 * (w21/709). "Above" stands while every such amount only adds to the actual,
 * "below" while every one only takes from it; anything else is not judged.
 */
export function standingStatus(
  status: VarianceStatus,
  notInTotal: readonly Holding[] = [],
): VarianceStatus | null {
  if (notInTotal.length === 0) return status;
  if (status === "above" && notInTotal.every((h) => h.number >= 0)) {
    return status;
  }
  if (status === "below" && notInTotal.every((h) => h.number <= 0)) {
    return status;
  }
  return null;
}

/** The earliest directive's date, or null with no history. */
function firstBudgetDate(
  budgetHistory: readonly { date: string }[],
): string | null {
  return budgetHistory.reduce<string | null>(
    (first, entry) =>
      first === null || entry.date < first ? entry.date : first,
    null,
  );
}

/**
 * A period with no target to miss: it ended before the first directive, or the
 * first directive has not started yet (dated after `today`, so the period holds
 * a zero budget that is no target at all). A period the first directive falls
 * in carries a back-filled target and is judged against it (w21/301).
 */
function beforeFirstBudget(
  point: BudgetSeriesPoint,
  firstBudget: string | null,
  today?: string,
): boolean {
  if (point.budget !== 0 || firstBudget === null) return false;
  return (
    point.date < firstBudget || (today !== undefined && firstBudget > today)
  );
}

/**
 * Whether each charted period landed on the good side of its own budget. Same
 * rule as the card's status badge — money tolerance and income inversion
 * included — so a bar can't contradict the badge sitting above it.
 *
 * `null` for a period that ended before the first budget directive: there was
 * no target to miss, yet its zero budget made any spending read as over, so a
 * new budget always looked behind on first view (w21/033). An explicit zero
 * budget is a target and is still judged.
 */
export function selectPointFavorability(
  series: BudgetSeriesPoint[],
  direction: 1 | -1,
  budgetHistory: readonly { date: string; amount?: string }[] = [],
  today?: string,
  currency?: string,
): (boolean | null)[] {
  const firstBudget = firstBudgetDate(budgetHistory);
  const scale = statusScale(budgetHistory, currency);
  return series.map((point) => {
    if (beforeFirstBudget(point, firstBudget, today)) return null;
    const status = standingStatus(
      varianceStatus(point.actual - Math.abs(point.budget), scale),
      point.notInTotal,
    );
    return status === null ? null : isFavorableVariance(status, direction);
  });
}

/**
 * Which charted periods had a budget: not those that ended before the first
 * directive, drawn greyed and unjudged. Their spending is no actual against a
 * target, yet the spoken summary counted it: "Actual $2.4K of $222.6
 * budgeted" (w21/807).
 */
export function selectBudgetedPeriods(
  series: BudgetSeriesPoint[],
  budgetHistory: readonly { date: string }[] = [],
  today?: string,
): boolean[] {
  const firstBudget = firstBudgetDate(budgetHistory);
  return series.map((point) => !beforeFirstBudget(point, firstBudget, today));
}

export function selectBudgetCardStats(
  group: BudgetGroup,
  series: BudgetSeriesPoint[],
  today?: string,
): BudgetCardStats {
  const direction = groupDirection(group);
  const latest = series.length > 0 ? series[series.length - 1] : null;

  // The series already carries the budget that was in effect for each charted
  // period — not today's amount — so a mid-year raise doesn't retroactively
  // rewrite history. Falls back to the current amount when nothing is charted.
  const budget = latest ? Math.abs(latest.budget) : Math.abs(group.value);

  const actual =
    latest && Number.isFinite(latest.actual) ? latest.actual : null;
  const notInTotal = latest?.notInTotal ?? [];

  // Before the budget existed there is no target, so no status and no
  // variance: its zero budget read every dollar as "Above target" in red over
  // an all-grey chart (w21/101).
  const firstBudget = firstBudgetDate(group.budgetHistory);
  if (latest && beforeFirstBudget(latest, firstBudget, today)) {
    return {
      budget,
      actual,
      variance: null,
      status: null,
      favorable: true,
      progressPercent: null,
      startsOn: firstBudget,
      notInTotal,
      unjudged: false,
    };
  }

  const variance = actual === null ? null : actual - budget;
  const judged =
    variance === null
      ? null
      : varianceStatus(
          variance,
          statusScale(group.budgetHistory, group.currency),
        );
  const status = judged === null ? null : standingStatus(judged, notInTotal);
  const favorable =
    status === null ? true : isFavorableVariance(status, direction);
  // A budget of nothing is full the moment anything is spent against it, as
  // Home draws it (w21/076); the card hid its meter instead (w21/763).
  const progressPercent =
    actual === null
      ? null
      : budget <= 0
        ? actual > 0
          ? 100
          : 0
        : Math.max(0, (actual / budget) * 100);

  return {
    budget,
    actual,
    variance,
    status,
    favorable,
    progressPercent,
    startsOn: null,
    notInTotal,
    unjudged: judged !== null && status === null,
  };
}
