import { useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import { scaleLinear } from "d3-scale";
import { ErrorBoundary } from "react-error-boundary";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, space, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { shortNumber } from "@/common/number-utils";
import { useHorizontalSwipeOwnerGesture } from "@/common/horizontal-swipe-owner";
import { AnimatedBar } from "./animated-bar";
import { useEntranceProgress } from "./use-entrance-progress";
import { LTR_PLOT } from "@/common/rtl";

/**
 * Height the legend row adds below the plot: its `paddingTop` (`space.sm`) plus
 * one line of `fontSizes.sm` label. A caller's skeleton has to include this or
 * the card grows by a legend's worth the moment data lands.
 */
export const LEGEND_HEIGHT = 26;

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
  favorables: boolean[];
  currencySymbol: string;
  height?: number;
};

const LEFT_PADDING = 50;
const MIN_COLUMN_WIDTH = 44;
const BOTTOM_PADDING = 30;
const TOP_PADDING = 20;
const AXIS_FONT_SIZE = 12;
const LABEL_FONT_SIZE = 13;
const BAR_INSET = 0.22; // fraction of the column left empty on each side

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
    // Same swatch the income/expense chart uses for its net line. A dashed
    // border on a zero-height view draws nothing on iOS, so the legend marks
    // the series by color, as the rest of the app does.
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
  currencySymbol,
  height = 200,
}: BudgetBarChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const swipeOwner = useHorizontalSwipeOwnerGesture();
  const scrollRef = useRef<ScrollView>(null);

  const chartHeight = height;
  const availableWidth = ScreenWidth - contentPadding * 2 - LEFT_PADDING;

  // Before the early return below: hooks cannot run conditionally.
  const entrance = useEntranceProgress(labels.length > 0);

  if (labels.length === 0) {
    return (
      <View style={[styles.placeholder, { height: chartHeight }]}>
        <Text style={styles.placeholderText}>{t("notEnoughChartData")}</Text>
      </View>
    );
  }

  const columnWidth = Math.max(
    MIN_COLUMN_WIDTH,
    availableWidth / labels.length,
  );
  const plotWidth = columnWidth * labels.length;
  const barWidth = columnWidth * (1 - BAR_INSET * 2);

  const yMax = Math.max(1, ...actuals, ...budgets);
  const yMin = Math.min(0, ...actuals, ...budgets);
  const yScale = scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight - BOTTOM_PADDING, TOP_PADDING])
    .nice();
  const zeroY = yScale(0);
  const yTicks = yScale.ticks(5);

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
    // Owner marker: horizontal drags belong to the plot's scroller (and to the
    // header and legend around it), never to the ledger drawer's edge swipe.
    <GestureDetector gesture={swipeOwner}>
      <View>
        <View style={styles.row}>
          {/* Fixed y-axis so tick labels stay put while the plot scrolls. */}
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
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            <Svg width={plotWidth} height={chartHeight}>
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

              <Line
                x1={0}
                x2={plotWidth}
                y1={zeroY}
                y2={zeroY}
                stroke={theme.black40}
                strokeWidth={1}
              />

              {actuals.map((value, i) => {
                const valueY = yScale(value);
                const rawHeight = value >= 0 ? zeroY - valueY : valueY - zeroY;
                const barHeight = Math.max(Math.abs(rawHeight), 2);
                const barY =
                  value >= 0 ? Math.min(valueY, zeroY - 2) : Math.max(zeroY, 0);
                return (
                  <AnimatedBar
                    key={`bar-${labels[i]}-${i}`}
                    x={columnX(i) + columnWidth * BAR_INSET}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    baselineY={zeroY}
                    fill={favorables[i] === false ? theme.error : theme.primary}
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
            </Svg>
          </ScrollView>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendSwatch, { backgroundColor: theme.primary }]}
            />
            <Text style={styles.legendText}>{t("budgetActual")}</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendLine, { backgroundColor: theme.secondary }]}
            />
            <Text style={styles.legendText}>{t("budget")}</Text>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

export const BudgetBarChartD3 = (props: BudgetBarChartProps) => (
  <ErrorBoundary
    fallback={null}
    onError={(error) => {
      console.error(error);
    }}
  >
    <BudgetBarChart {...props} />
  </ErrorBoundary>
);
