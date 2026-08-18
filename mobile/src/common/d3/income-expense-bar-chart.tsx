import { useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { scaleBand, scaleLinear } from "d3-scale";
import { curveMonotoneX, line as d3Line } from "d3-shape";
import { ErrorBoundary } from "react-error-boundary";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, space, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { shortNumber } from "@/common/number-utils";
import { AnimatedBar } from "./animated-bar";
import { useEntranceProgress } from "./use-entrance-progress";

/** Default plot height, exported so callers can size a skeleton from it. */
export const DEFAULT_CHART_HEIGHT = 220;

/**
 * Height the legend row adds below the plot: its `paddingTop` (`space.sm`) plus
 * one line of `fontSizes.sm` label. A caller's skeleton has to include this or
 * the card grows by a legend's worth the moment data lands.
 */
export const LEGEND_HEIGHT = 26;
import { useHorizontalSwipeOwnerGesture } from "@/common/horizontal-swipe-owner";
import { LTR_PLOT } from "@/common/rtl";

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
const LEFT_PADDING = 50;
const MIN_GROUP_WIDTH = 44;
const BOTTOM_PADDING = 30;
const TOP_PADDING = 20;
const AXIS_FONT_SIZE = 12;
const LABEL_FONT_SIZE = 13;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      ...LTR_PLOT,
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      fontSize: fontSizes.md,
      color: theme.black60,
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      paddingTop: space.sm,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: space.md,
    },
    legendSwatch: {
      width: 10,
      height: 10,
      borderRadius: 2,
      marginEnd: space.xs,
    },
    legendLine: {
      width: 14,
      height: 3,
      borderRadius: 2,
      marginEnd: space.xs,
    },
    legendText: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
  });

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
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const swipeOwner = useHorizontalSwipeOwnerGesture();
  const scrollRef = useRef<ScrollView>(null);

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
    return (
      <View style={[styles.placeholder, { height: chartHeight }]}>
        <Text style={styles.placeholderText}>{t("notEnoughChartData")}</Text>
      </View>
    );
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
  const yTicks = yScale.ticks(5);

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
    const valueY = yScale(value);
    let barHeight = value >= 0 ? zeroY - valueY : valueY - zeroY;
    let barY = value >= 0 ? valueY : zeroY;
    if (Math.abs(barHeight) < 2) {
      barHeight = 2; // keep a sliver visible for near-zero months
      barY = value >= 0 ? zeroY - 2 : zeroY;
    }
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
    // Own horizontal swipes so scrubbing the months doesn't also open the ledger
    // drawer (gesture-handler blocks its edge swipe for the life of any touch
    // that lands in here). Same pattern as InteractiveLineChartD3; on the outer
    // View so it also covers touches starting on the y-axis gutter or legend.
    <GestureDetector gesture={swipeOwner}>
      <View>
        <View style={styles.row}>
          {/* Fixed y-axis: tick labels stay visible while the plot scrolls. */}
          <Svg width={LEFT_PADDING} height={chartHeight}>
            {yTicks.map((tick: number, i: number) => (
              <SvgText
                key={`y-${i}`}
                x={LEFT_PADDING - 4}
                y={yScale(tick) + 5}
                fontSize={AXIS_FONT_SIZE}
                fill={theme.text01}
                textAnchor="end"
              >
                {`${currencySymbol}${shortNumber(tick)}`}
              </SvgText>
            ))}
          </Svg>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            // Open long spans on the most recent months. Fires once content is
            // measured (avoids the first-mount layout race) and again only when the
            // plot width changes (a new range/data), so it never yanks the user
            // back mid-scroll on unrelated re-renders. A no-op when it all fits.
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            <Svg width={plotWidth} height={chartHeight}>
              {/* Y grid lines (span the whole plot) */}
              {yTicks.map((tick: number, i: number) => (
                <Line
                  key={`grid-${i}`}
                  x1={0}
                  x2={plotWidth}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  stroke={theme.black40}
                  strokeDasharray="4,2"
                  strokeWidth={1}
                />
              ))}

              {/* Solid zero baseline — the net line references it. */}
              <Line
                x1={0}
                x2={plotWidth}
                y1={zeroY}
                y2={zeroY}
                stroke={theme.black40}
                strokeWidth={1}
              />

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
                <Path
                  d={netPath}
                  fill="none"
                  stroke={netColor}
                  strokeWidth={2.5}
                />
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
            </Svg>
          </ScrollView>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendSwatch, { backgroundColor: theme.success }]}
            />
            <Text style={styles.legendText}>{t("income")}</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendSwatch, { backgroundColor: theme.error }]}
            />
            <Text style={styles.legendText}>{t("expenses")}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: netColor }]} />
            <Text style={styles.legendText}>{t("netProfit")}</Text>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

export const IncomeExpenseBarChartD3 = (props: IncomeExpenseBarChartProps) => (
  <ErrorBoundary
    fallback={null}
    onError={(error) => {
      console.error(error);
    }}
  >
    <IncomeExpenseBarChart {...props} />
  </ErrorBoundary>
);
