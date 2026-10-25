import { View } from "react-native";
import { Path, Text as SvgText } from "react-native-svg";
import { scaleLinear } from "d3-scale";
import { contentPadding } from "@/common/screen-util";
import { useChartWidth } from "./use-chart-width";
import { formatShortMoneyWithCurrency } from "@/common/number-utils";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { AnimatedBar } from "./animated-bar";
import { barChartValueDomain } from "./bar-chart-domain";
import { useEntranceProgress } from "./use-entrance-progress";
import { restingBarRect } from "./bar-geometry";
import { ScrollableAxisChart } from "./scrollable-axis-chart";
import { budgetColumnWidth } from "./budget-chart-columns";
import { axisLabelWidth } from "./axis-label-width";
import {
  AXIS_FONT_SIZE,
  BOTTOM_PADDING,
  ChartErrorBoundary,
  ChartPlaceholder,
  LABEL_FONT_SIZE,
  LEFT_PADDING,
  LegendItem,
  TOP_PADDING,
} from "./chart-chrome";

export { LEGEND_HEIGHT } from "./chart-chrome";

type BudgetBarChartProps = {
  /** Period labels, one per column (already display-ready). */
  labels: string[];
  /** Actual activity magnitudes, aligned 1:1 with `labels`. */
  actuals: number[];
  /** Prorated budget for each period, aligned 1:1 with `labels`. */
  budgets: number[];
  /**
   * Whether each period landed on the good side of its target, aligned 1:1 with
   * `labels`. Decided by the caller — expense and income budgets invert the
   * rule, and the selectors already own that decision.
   */
  /** `null` for a period with no budget yet: drawn neutral, not judged. */
  favorables: (boolean | null)[];
  currency: string;
  /**
   * Screen-reader summary of the series — `ScrollableAxisChart` wraps the plot in
   * `accessible`, so without this the chart announces only its axis and legend.
   * Built by `budgetChartSummary` in the budget screen's selectors (which owns
   * the budget vocabulary); `undefined` only for an empty series, where the
   * placeholder's own visible text is the summary. Required rather than optional
   * so a second caller has to make the same decision deliberately.
   */
  accessibilityLabel: string | undefined;
  height?: number;
};

const MIN_COLUMN_WIDTH = 44;
const BAR_INSET = 0.22; // fraction of the column left empty on each side

/**
 * Budget-vs-actual chart: one bar per period for actual activity, with the
 * prorated budget overlaid as a dashed step line. The line steps (rather than
 * curves) because a budget holds flat until a newer directive takes effect —
 * a raise mid-year should read as a discrete change, not a slope.
 *
 * Bars are tinted by whether that period landed on the favorable side of its
 * own budget, so over-target periods stand out without reading the axis.
 */
function BudgetBarChart({
  labels,
  actuals,
  budgets,
  favorables,
  currency,
  accessibilityLabel,
  height = 200,
}: BudgetBarChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t, locale } = useTranslations();

  const chartHeight = height;
  // The width the chart really has, once laid out. Until then, the live
  // window less the Budget list's gutter and the card's own, so the first
  // frame is close — and a rotation before layout still lands right (w21/1004).
  const { width: containerWidth, onLayout } = useChartWidth(contentPadding * 4);

  // Before the early return below: hooks cannot run conditionally.
  const entrance = useEntranceProgress(labels.length > 0);

  if (labels.length === 0) {
    return <ChartPlaceholder height={chartHeight} />;
  }

  // The series' own extent, as Spending's and Reports' charts take it: a floor
  // of 1 left a BTC budget's bars as slivers on a 0 to 1 axis (w21/456).
  const [yMin, yMax] = barChartValueDomain([...actuals, ...budgets]);
  const yScale = scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight - BOTTOM_PADDING, TOP_PADDING])
    .nice();
  const zeroY = yScale(0);
  const yTicks = yScale.ticks(5);
  // The y-axis column fits its widest tick: the fixed 50 px clipped "2,5 Tsd. $"
  // to "5 Tsd. $" in German, so 2,500 and 1,500 read alike (w21/360).
  const axisWidth = axisLabelWidth(
    yTicks.map((tick) => formatShortMoneyWithCurrency(tick, currency, locale)),
    AXIS_FONT_SIZE,
    LEFT_PADDING,
  );

  const columnWidth = budgetColumnWidth(
    containerWidth,
    axisWidth,
    labels.length,
    MIN_COLUMN_WIDTH,
  );
  const plotWidth = columnWidth * labels.length;
  const barWidth = columnWidth * (1 - BAR_INSET * 2);

  const columnX = (i: number) => i * columnWidth;
  const centerX = (i: number) => columnX(i) + columnWidth / 2;

  // A budget that holds flat across periods draws as one horizontal run; a
  // change draws a vertical riser at the period boundary.
  const budgetPath = budgets
    .map((value, i) => {
      const y = yScale(value);
      const left = columnX(i);
      const right = left + columnWidth;
      return i === 0
        ? `M${left},${y} L${right},${y}`
        : `L${left},${y} L${right},${y}`;
    })
    .join(" ");

  return (
    <View onLayout={onLayout}>
      <ScrollableAxisChart
        chartHeight={chartHeight}
        plotWidth={plotWidth}
        yTicks={yTicks}
        axisWidth={axisWidth}
        yScale={yScale}
        currency={currency}
        accessibilityLabel={accessibilityLabel}
        legend={
          <>
            <LegendItem color={theme.primary} label={t("budgetActual")} />
            <LegendItem
              mark="line"
              color={theme.secondary}
              label={t("budget")}
            />
          </>
        }
      >
        {actuals.map((value, i) => {
          const { y: barY, height: barHeight } = restingBarRect(
            value,
            yScale(value),
            zeroY,
          );
          return (
            <AnimatedBar
              key={`bar-${labels[i]}-${i}`}
              x={columnX(i) + columnWidth * BAR_INSET}
              y={barY}
              width={barWidth}
              height={barHeight}
              baselineY={zeroY}
              fill={
                favorables[i] === null
                  ? theme.black40
                  : favorables[i] === false
                    ? theme.error
                    : theme.primary
              }
              rx={2}
              progress={entrance}
              index={i}
              count={actuals.length}
            />
          );
        })}

        {/* Budget reference: dashed, stepped, drawn over the bars. */}
        <Path
          d={budgetPath}
          fill="none"
          stroke={theme.secondary}
          strokeWidth={2}
          strokeDasharray="5,3"
        />

        {labels.map((label, i) => (
          <SvgText
            key={`x-${label}-${i}`}
            x={centerX(i)}
            y={chartHeight - 8}
            fontSize={LABEL_FONT_SIZE}
            fill={theme.text01}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </ScrollableAxisChart>
    </View>
  );
}

export const BudgetBarChartD3 = (props: BudgetBarChartProps) => (
  <ChartErrorBoundary>
    <BudgetBarChart {...props} />
  </ChartErrorBoundary>
);
