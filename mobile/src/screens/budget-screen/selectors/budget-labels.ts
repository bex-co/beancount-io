/**
 * Interval and time-span vocabulary for the budget screens. Pure string
 * mapping, kept out of the components so the fava `time` filter values are
 * unit-testable.
 */
import { utcDate } from "../../../common/calendar-date";
import { formatLedgerMonthDay } from "../../../common/date-format";
import { getFormatDate } from "../../../common/format-util";
import { formatShortMoneyWithCurrency } from "../../../common/number-utils";
import { formatTimeFilter } from "../../transactions-screen/filters/select-filter-query";
import {
  addDaysISO,
  nextIntervalStartISO,
  type VarianceStatus,
} from "./budget-selectors";

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
 *
 * A bar is labelled by the period's own last day, not the date the server
 * sent: on a windowed span the last range ends today, so the current quarter
 * read as the current month ("OCT") where the full history said "DEC", and
 * this week as 10/21 beside 10/25 (w21/219).
 */
export function periodAxisLabel(
  date: string,
  interval: string,
  t: (key: string) => string,
  locale = "en",
  /**
   * The last day of a window that ended before today, which ends its last
   * period early: last year's last week runs to January 4 and was labelled
   * "1/4", a date of the next year (w21/764).
   */
  windowEnd?: string,
): string {
  const normalized = interval.toLowerCase();
  if (normalized === "yearly") {
    return date.slice(0, 4);
  }
  if (normalized === "daily") {
    return formatLedgerMonthDay(date, locale);
  }
  const periodEnd = addDaysISO(nextIntervalStartISO(date, interval), -1);
  const end =
    windowEnd !== undefined && windowEnd < periodEnd ? windowEnd : periodEnd;
  if (normalized === "weekly") {
    return formatLedgerMonthDay(end, locale);
  }
  return t(end.slice(5, 7));
}

/**
 * Translation key for a cadence used as an adjective in a sentence ("the
 * monthly budget"). The picker's label is an adverb in several languages, so
 * lowercased into the delete alert it read "Das monatlich Budget" and
 * "ежемесячно бюджет" (w21/097).
 */
const INTERVAL_ADJECTIVE_KEYS: Record<string, string> = {
  daily: "budgetIntervalAdjDaily",
  weekly: "budgetIntervalAdjWeekly",
  monthly: "budgetIntervalAdjMonthly",
  quarterly: "budgetIntervalAdjQuarterly",
  yearly: "budgetIntervalAdjYearly",
};

export function intervalAdjectiveKey(interval: string): string {
  return (
    INTERVAL_ADJECTIVE_KEYS[interval.toLowerCase()] ??
    "budgetIntervalAdjMonthly"
  );
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
 * The window Home's budget panel prices actuals over: January through the end
 * of the current month. It holds for the whole month, where year-to-date
 * ended on today and so changed every day, leaving the next day offline with
 * no cached actuals to read (w21/184).
 */
export function budgetPanelWindow(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const lastDay = utcDate(year, month, 0).getUTCDate();
  return formatTimeFilter({
    start: `${today.slice(0, 4)}-01-01`,
    end: `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`,
  });
}

/**
 * Map a pill to fava's `time` filter syntax. `undefined` means no filter (all
 * time). Every other span is an explicit inclusive range built from the
 * device's date, never a relative variable the server resolves on its own
 * calendar. Year to date and the rolling window end today: fava's `year`
 * is the whole calendar year, which charted unstarted months and made the
 * card report a budget for a month that had not begun.
 */
export function timeSpanToFilter(
  span: BudgetTimeSpan,
  today: string = getFormatDate(new Date()),
): string | undefined {
  switch (span) {
    case "this-year":
      return formatTimeFilter({
        start: `${today.slice(0, 4)}-01-01`,
        end: today,
      });
    case "last-year": {
      // From the device's date, as "This year" is: fava's `year-1` resolves
      // on the server's calendar, so around New Year the two chips charted
      // different "years" for hours (w21/148).
      const year = String(Number(today.slice(0, 4)) - 1).padStart(4, "0");
      return formatTimeFilter({
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      });
    }
    case "last-12m": {
      // Same calendar date one year back through today, matching the
      // dashboard's `subYears(now, 1) → now` window. A leap day clamps to
      // 28 Feb: "2023-02-29" is no date, and the server refused the whole
      // range every 29 February (w21/063).
      const year = Number(today.slice(0, 4)) - 1;
      const month = Number(today.slice(5, 7));
      const lastDay = utcDate(year, month, 0).getUTCDate();
      const day = Math.min(Number(today.slice(8, 10)), lastDay);
      return formatTimeFilter({
        start: `${String(year).padStart(4, "0")}-${today.slice(5, 7)}-${String(day).padStart(2, "0")}`,
        end: today,
      });
    }
    default:
      return undefined;
  }
}

/**
 * The first day a budget window's `time` filter covers, or undefined for all
 * time. The first charted period starts there, often partway through
 * (w21/102).
 */
export function timeWindowStart(
  time: string | undefined,
  today: string = getFormatDate(new Date()),
): string | undefined {
  if (!time) return undefined;
  if (time === "year-1") {
    return `${String(Number(today.slice(0, 4)) - 1).padStart(4, "0")}-01-01`;
  }
  const match = /^(\d{4}-\d{2}-\d{2}) - /.exec(time);
  return match ? match[1] : undefined;
}

/**
 * The last day a budget window's `time` filter covers, or undefined for all
 * time.
 */
export function timeWindowEnd(
  time: string | undefined,
  today: string,
): string | undefined {
  if (!time) return undefined;
  if (time === "year-1") {
    return `${String(Number(today.slice(0, 4)) - 1).padStart(4, "0")}-12-31`;
  }
  const match = / - (\d{4}-\d{2}-\d{2})$/.exec(time);
  return match ? match[1] : undefined;
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
    favorables: (boolean | null)[];
    currency: string;
    /**
     * Each period's end day, aligned with `labels`. With them a span that
     * crosses a year names the years of its first and last label ("NOV
     * 2024–SEP 2026"); without, the labels stand alone.
     */
    dates?: string[];
    /** `-1` for an income target, where missing it means falling short. */
    direction?: 1 | -1;
    /**
     * Which periods had a budget (`selectBudgetedPeriods`). Only those are
     * summed and counted: spending from before the budget existed read as
     * actual against it (w21/807). All of them when none had one yet.
     */
    budgeted?: boolean[];
  },
  t: (key: string, params?: Record<string, unknown>) => string,
  locale = "en",
): string | undefined {
  const kept = series.labels
    .map((_, index) => index)
    .filter((index) => series.budgeted?.[index] !== false);
  const pick = <T>(values: T[] | undefined) =>
    values === undefined || kept.length === 0
      ? values
      : kept.map((index) => values[index]!);
  const labels = pick(series.labels)!;
  const actuals = pick(series.actuals)!;
  const budgets = pick(series.budgets)!;
  const favorables = pick(series.favorables)!;
  const dates = pick(series.dates);
  const { currency, direction } = series;
  if (labels.length === 0) return undefined;

  const money = (values: number[]) =>
    formatShortMoneyWithCurrency(
      values.reduce((sum, value) => sum + value, 0),
      currency,
      locale,
    );
  const last = labels.length - 1;
  // A year-long axis label is its own year; any other gets the year of its day.
  const named = (index: number) => {
    const label = labels[index]!;
    const year = dates?.[index]?.slice(0, 4);
    return year && !/^\d{4}$/.test(label) ? `${label} ${year}` : label;
  };
  const crossesYear =
    dates !== undefined &&
    dates[0] !== undefined &&
    dates[last] !== undefined &&
    dates[0].slice(0, 4) !== dates[last]!.slice(0, 4);
  const span =
    labels.length === 1
      ? labels[0]
      : crossesYear
        ? `${named(0)}–${named(last)}`
        : `${labels[0]}–${labels[last]}`;

  // Only an explicit `false` is unfavorable; a period the selectors could not
  // judge (no budget yet) is not counted against the target. Worded by what
  // missing the target means: spending over it, income below it (w21/457).
  const missed = favorables.filter((favorable) => favorable === false).length;

  return t("budgetChartSummary", {
    span,
    count: labels.length,
    actual: money(actuals),
    budget: money(budgets),
    missed: t(
      direction === -1 ? "budgetSummaryBelowTarget" : "budgetSummaryOverTarget",
      { count: missed },
    ),
  });
}
