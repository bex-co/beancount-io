import { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { scaleBand, scaleLinear } from "d3-scale";
import { curveMonotoneX, line as d3Line } from "d3-shape";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { shortNumber } from "@/common/number-utils";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { AnimatedBar } from "./animated-bar";
import { useEntranceProgress } from "./use-entrance-progress";
import { restingBarRect } from "./bar-geometry";
import { ScrollableAxisChart } from "./scrollable-axis-chart";
import {
  BOTTOM_PADDING,
  ChartErrorBoundary,
  ChartPlaceholder,
  LABEL_FONT_SIZE,
  LEFT_PADDING,
  LegendItem,
  TOP_PADDING,
} from "./chart-chrome";

/** Default plot height, exported so callers can size a skeleton from it. */
export const DEFAULT_CHART_HEIGHT = 220;

export { LEGEND_HEIGHT } from "./chart-chrome";

type IncomeExpenseBarChartProps = {
  /**
   * Unique, ascending "YYYY-MM" month keys — the x identity. Full keys (not "MM")
   * so a span crossing a year keeps a distinct column per month. The display
   * label is derived per column via `t(month.slice(5, 7))`.
   */
  months: string[];
  /** Positive income magnitudes, aligned 1:1 with `months`. */
  income: number[];
  /** Positive expense magnitudes, aligned 1:1 with `months`. */
  expense: number[];
  /** Signed net profit, aligned 1:1 with `months`. */
  net: number[];
  currencySymbol: string;
  height?: number;
};

// Chart geometry. `LEFT_PADDING` is the fixed y-axis gutter; `MIN_GROUP_WIDTH`
// is the smallest a month column shrinks to before the plot starts scrolling
// horizontally instead (keeps bars and labels readable at long spans).
const MIN_GROUP_WIDTH = 44;

/**
 * Combined monthly chart for the Reports page: grouped Income (green) vs Expense
 * (red) bars with a Net Profit line overlaid on the same axes, plus a legend.
 *
 * The x identity is the unique "YYYY-MM" key (not "MM"), so a span crossing a
 * year keeps one column per month instead of collapsing repeats. Columns hold a
 * fixed minimum width; when there are more months than fit, the plot scrolls
 * horizontally while the y-axis stays pinned on the left.
 */
function IncomeExpenseBarChart({
  months,
  income,
  expense,
  net,
  currencySymbol,
  height = DEFAULT_CHART_HEIGHT,
}: IncomeExpenseBarChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  const chartHeight = height;
  // Width available to the scrolling plot (everything but the fixed y-axis).
  const availableWidth = ScreenWidth - contentPadding * 2 - LEFT_PADDING;

  // The net line needs a hue distinct from both bars. `theme.information` (blue)
  // stays legible against green income / red expense in light AND dark — unlike
  // `theme.primary`, which IS the green income bar in dark mode.
  const netColor = theme.information;

  const groupWidth = Math.max(
    MIN_GROUP_WIDTH,
    availableWidth / Math.max(months.length, 1),
  );
  const plotWidth = groupWidth * months.length;

  // Before the early return below: hooks cannot run conditionally.
  const entrance = useEntranceProgress(months.length > 0);

  if (months.length === 0) {
    return <ChartPlaceholder height={chartHeight} />;
  }

  const subScale = scaleBand<string>()
    .domain(["income", "expense"])
    .range([0, groupWidth])
    .padding(0.2);
  const subBarWidth = subScale.bandwidth();

  const maxBar = Math.max(0, ...income, ...expense);
  const yMax = Math.max(maxBar, ...net, 1);
  const yMin = Math.min(0, ...net); // net can dip below zero (a loss month)
  const yScale = scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight - BOTTOM_PADDING, TOP_PADDING])
    .nice();
  const zeroY = yScale(0);

  const groupX = (i: number) => i * groupWidth;
  const centerX = (i: number) => groupX(i) + groupWidth / 2;

  const barRect = (
    value: number,
    x: number,
    key: string,
    fill: string,
    // Both bars of a month share an index, so a month's income and expense
    // grow together and the cascade reads left-to-right across the series
    // rather than alternating within each pair.
    index: number,
  ): JSX.Element => {
    const { y: barY, height: barHeight } = restingBarRect(
      value,
      yScale(value),
      zeroY,
    );
    return (
      <AnimatedBar
        key={key}
        x={x}
        y={barY}
        width={subBarWidth}
        height={Math.abs(barHeight)}
        baselineY={zeroY}
        fill={fill}
        rx={2}
        progress={entrance}
        index={index}
        count={months.length}
      />
    );
  };

  const hasLine = months.length >= 2; // curveMonotoneX needs ≥2 points
  const netPath = hasLine
    ? (d3Line<number>()
        .x((_, i) => centerX(i))
        .y((value) => yScale(value))
        .curve(curveMonotoneX)(net) ?? "")
    : "";

  return (
    <ScrollableAxisChart
      chartHeight={chartHeight}
      plotWidth={plotWidth}
      yTicks={yScale.ticks(5)}
      yScale={yScale}
      currencySymbol={currencySymbol}
      accessibilityLabel={t("incomeExpenseChartSummary", {
        count: months.length,
        income: `${currencySymbol}${shortNumber(
          income.reduce((sum, v) => sum + v, 0),
        )}`,
        expense: `${currencySymbol}${shortNumber(
          expense.reduce((sum, v) => sum + v, 0),
        )}`,
        net: `${currencySymbol}${shortNumber(
          net.reduce((sum, v) => sum + v, 0),
        )}`,
      })}
      legend={
        <>
          <LegendItem color={theme.success} label={t("income")} />
          <LegendItem color={theme.error} label={t("expenses")} />
          <LegendItem mark="line" color={netColor} label={t("netProfit")} />
        </>
      }
    >
      {/* Grouped income / expense bars */}
      {months.map((month, i) => {
        const x0 = groupX(i);
        return (
          <G key={`group-${month}`}>
            {barRect(
              income[i],
              x0 + (subScale("income") ?? 0),
              `inc-${month}`,
              theme.success,
              i,
            )}
            {barRect(
              expense[i],
              x0 + (subScale("expense") ?? 0),
              `exp-${month}`,
              theme.error,
              i,
            )}
          </G>
        );
      })}

      {/* Net profit line + per-point dots (dots keep a single month visible) */}
      {hasLine && (
        <Path d={netPath} fill="none" stroke={netColor} strokeWidth={2.5} />
      )}
      {net.map((value, i) => (
        <Circle
          key={`net-${months[i]}`}
          cx={centerX(i)}
          cy={yScale(value)}
          r={3}
          fill={netColor}
        />
      ))}

      {/* X axis labels — month abbreviation per column */}
      {months.map((month, i) => (
        <SvgText
          key={`x-${month}`}
          x={centerX(i)}
          y={chartHeight - 8}
          fontSize={LABEL_FONT_SIZE}
          fill={theme.text01}
          textAnchor="middle"
        >
          {t(month.slice(5, 7))}
        </SvgText>
      ))}
    </ScrollableAxisChart>
  );
}

export const IncomeExpenseBarChartD3 = (props: IncomeExpenseBarChartProps) => (
  <ChartErrorBoundary>
    <IncomeExpenseBarChart {...props} />
  </ChartErrorBoundary>
);
