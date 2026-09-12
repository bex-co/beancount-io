/**
 * Interval and time-span vocabulary for the budget screens. Pure string
 * mapping, kept out of the components so the fava `time` filter values are
 * unit-testable.
 */
import { getFormatDate } from "../../../common/format-util";
import { shortNumber } from "../../../common/number-utils";
import { formatTimeFilter } from "../../transactions-screen/filters/select-filter-query";
import type { VarianceStatus } from "./budget-selectors";

/** Translation key for a directive's cadence, e.g. "monthly" → budgetIntervalMonthly. */
const INTERVAL_LABEL_KEYS: Record<string, string> = {
  daily: "budgetIntervalDaily",
  weekly: "budgetIntervalWeekly",
  monthly: "budgetIntervalMonthly",
  quarterly: "budgetIntervalQuarterly",
  yearly: "budgetIntervalYearly",
};

export function intervalLabelKey(interval: string): string {
  // Unknown cadences label as monthly, matching the proration fallback.
  return INTERVAL_LABEL_KEYS[interval.toLowerCase()] ?? "budgetIntervalMonthly";
}

/**
 * Axis label for one charted period. Monthly and quarterly periods reuse the
 * app's existing month-abbreviation keys ("01".."12"); longer and shorter
 * cadences label themselves.
 */
export function periodAxisLabel(
  date: string,
  interval: string,
  t: (key: string) => string,
): string {
  const normalized = interval.toLowerCase();
  if (normalized === "yearly") {
    return date.slice(0, 4);
  }
  if (normalized === "weekly" || normalized === "daily") {
    return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  }
  return t(date.slice(5, 7));
}

/** Cadences offered by the add form, in chronological order. */
export const BUDGET_INTERVALS = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
] as const;

/** Exhaustive, so a new variance status is a compile error rather than "On target". */
export const STATUS_LABEL_KEYS: Record<VarianceStatus, string> = {
  above: "budgetAboveTarget",
  below: "budgetBelowTarget",
  on: "budgetOnTarget",
};

/**
 * Budget's window keys. A narrower set than the app's `TimeRange` because the
 * windows are calendar-anchored (fava evaluates them server-side) rather than
 * rolling — but they wear the same pill labels as every other chart, so the
 * control reads identically across the app. Same pattern as the transactions
 * filter's `DateRangeKey`.
 */
export type BudgetTimeSpan = "this-year" | "last-year" | "last-12m" | "all";

export const BUDGET_TIME_SPANS: BudgetTimeSpan[] = [
  "this-year",
  "last-year",
  "last-12m",
  "all",
];

/**
 * The span both the page and the Home panel open on. They must agree: the
 * panel reads the latest period out of the same query the page renders, so a
 * shared default means one cached result serves both instead of two.
 */
export const DEFAULT_BUDGET_SPAN: BudgetTimeSpan = "this-year";

export const TIME_SPAN_LABEL_KEYS: Record<BudgetTimeSpan, string> = {
  "this-year": "rangeYTD",
  "last-year": "rangeLastYear",
  "last-12m": "range1Y",
  all: "rangeAll",
};

/**
 * Map a pill to fava's `time` filter syntax. `undefined` means no filter (all
 * time); `year` / `year-1` are fava's relative-year variables; the rolling
 * window is an explicit inclusive range.
 */
export function timeSpanToFilter(
  span: BudgetTimeSpan,
  today: string = getFormatDate(new Date()),
): string | undefined {
  switch (span) {
    case "this-year":
      return "year";
    case "last-year":
      return "year-1";
    case "last-12m": {
      // Same calendar date one year back through today, matching the
      // dashboard's `subYears(now, 1) → now` window.
      const year = Number(today.slice(0, 4));
      return formatTimeFilter({
        start: `${year - 1}${today.slice(4)}`,
        end: today,
      });
    }
    default:
      return undefined;
  }
}

/**
 * Screen-reader summary of the budget-vs-actual chart.
 *
 * `ScrollableAxisChart` wraps the plot in `accessible` — so with no label the
 * whole group collapses to the axis and legend text and the series itself is
 * unreadable. Same shape as `incomeExpenseChartSummary`: span, totals, and the
 * one judgement the bars encode (how many periods landed on the wrong side of
 * their target).
 *
 * `undefined` when there is nothing charted: that branch renders
 * `ChartPlaceholder`, whose visible "not enough data" text is already the
 * summary, and a second one would double-announce.
 */
export function budgetChartSummary(
  series: {
    labels: string[];
    actuals: number[];
    budgets: number[];
    favorables: boolean[];
    currencySymbol: string;
  },
  t: (key: string, params?: Record<string, unknown>) => string,
): string | undefined {
  const { labels, actuals, budgets, favorables, currencySymbol } = series;
  if (labels.length === 0) return undefined;

  const money = (values: number[]) =>
    `${currencySymbol}${shortNumber(values.reduce((sum, value) => sum + value, 0))}`;
  const span =
    labels.length === 1
      ? labels[0]
      : `${labels[0]}–${labels[labels.length - 1]}`;

  return t("budgetChartSummary", {
    span,
    count: labels.length,
    actual: money(actuals),
    budget: money(budgets),
    // Only an explicit `false` is unfavorable; a period the selectors could not
    // judge (no budget yet) is not counted against the target.
    over: favorables.filter((favorable) => favorable === false).length,
  });
}
