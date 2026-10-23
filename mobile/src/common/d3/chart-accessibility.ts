import { selectedPeriodLabel } from "../series-util";
import {
  changePercent,
  describeChange,
  formatChangePercent,
} from "./change-percent";

/**
 * What a screen reader needs from the interactive line chart (w21/316). The
 * plot exposed nothing: VoiceOver read the headline and the change row and
 * skipped the curve, and since a one-finger drag is a navigation gesture there,
 * no earlier month could be reached. The plot becomes one adjustable element
 * with a range summary, the selected point as its value, and increment and
 * decrement actions that step the same index the header follows.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
export type ChartAccessibilitySeries = {
  /** Translation keys of the point labels, as `labels` is on the chart. */
  labels: string[];
  periods?: string[];
  numbers: number[];
  /** The balance the change row measures from. */
  baseline: number;
  /**
   * No percent for the change, as the change row reads it on a chart the
   * caller marks neutral: a split's units were read as a 900% gain (w21/783).
   */
  neutral?: boolean;
  format: (value: number, includePlus?: boolean) => string;
  translate: (key: string, params?: Record<string, unknown>) => string;
};

function periodAt(series: ChartAccessibilitySeries, index: number): string {
  return selectedPeriodLabel(
    series.translate(series.labels[index] ?? ""),
    series.periods?.[index],
  );
}

/**
 * The plot's label: the heading, then the first and last points with their
 * values, and the low and high. Null with fewer than two points, where there is
 * no curve to describe.
 */
export function chartSummaryLabel(
  heading: string | undefined,
  series: ChartAccessibilitySeries,
): string | null {
  const { numbers, format, translate } = series;
  if (numbers.length < 2) return null;
  const last = numbers.length - 1;
  const summary = translate("chartSummary", {
    start: periodAt(series, 0),
    startValue: format(numbers[0]!),
    end: periodAt(series, last),
    endValue: format(numbers[last]!),
    low: format(Math.min(...numbers)),
    high: format(Math.max(...numbers)),
  });
  return heading ? `${heading}, ${summary}` : summary;
}

/** The selected point: its period, value and change since the window opened. */
export function chartPointText(
  series: ChartAccessibilitySeries,
  index: number,
): string {
  const { numbers, baseline, format, translate, neutral } = series;
  const value = numbers[index] ?? 0;
  const pct = neutral ? null : changePercent(baseline, value);
  const shownPct = pct === null ? null : formatChangePercent(pct);
  // As the change row reads it: a change that rounds to nothing is "$0.00",
  // not "+$0.00" (w21/416, w21/543).
  const { amount } = describeChange(value - baseline, shownPct, format);
  return translate("chartPointValue", {
    period: periodAt(series, index),
    value: format(value),
    change: shownPct === null ? amount : `${amount} (${shownPct.text})`,
  });
}

/**
 * The index one step from `current` (the latest point when none is selected),
 * kept inside the series: increment moves to a later month, decrement to an
 * earlier one.
 */
export function stepChartIndex(
  current: number | null,
  delta: 1 | -1,
  count: number,
): number {
  const from = current ?? count - 1;
  return Math.min(count - 1, Math.max(0, from + delta));
}

/** How long a selected point stays after the last step before the chart rests. */
export const CHART_STEP_REST_MS = 5000;
