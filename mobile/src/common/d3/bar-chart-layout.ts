import { axisLabelWidth } from "./axis-label-width";

/** The narrowest y-axis gutter; short USD ticks have always fit in it. */
export const BAR_CHART_MIN_AXIS_WIDTH = 50;

/** Outer and inner band padding, as a fraction of one band step. */
const BAND_PADDING = 0.2;
/** A bar's width as a fraction of the plot width per bar. */
const BAR_FILL = 0.6;

export type BarChartLayout = {
  /** Gutter reserved for the y-axis labels; the plot starts here. */
  axisWidth: number;
  /** Width of each bar. */
  barWidth: number;
  /** Left edge of bar `i`. */
  barX: (i: number) => number;
  /** Centre of bar `i`, where its x-axis label sits. */
  labelX: (i: number) => number;
};

/**
 * Horizontal geometry for the Home spending bar chart.
 *
 * The gutter is sized from the *formatted* y-tick strings, so a currency code
 * such as `0.8 MSEK` keeps its leading digit instead of running off the card's
 * clipped left edge. Bars and their labels are laid out in what remains, the
 * way a d3 band scale with 0.2 padding would, so a wider gutter narrows the
 * bars rather than pushing them past the right edge.
 */
export function barChartLayout(
  chartWidth: number,
  tickLabels: string[],
  count: number,
  axisFontSize: number,
): BarChartLayout {
  const axisWidth = axisLabelWidth(
    tickLabels,
    axisFontSize,
    BAR_CHART_MIN_AXIS_WIDTH,
  );
  const plotWidth = Math.max(0, chartWidth - axisWidth);
  // d3's band step with equal inner/outer padding: n - inner + 2 * outer.
  const step = count > 0 ? plotWidth / (count + BAND_PADDING) : 0;
  const barWidth = count > 0 ? (plotWidth / count) * BAR_FILL : 0;
  const barX = (i: number) => axisWidth + step * BAND_PADDING + step * i;
  return {
    axisWidth,
    barWidth,
    barX,
    labelX: (i: number) => barX(i) + barWidth / 2,
  };
}
