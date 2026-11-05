import { ReactNode, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Line, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { formatShortMoneyWithCurrency } from "@/common/number-utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { useHorizontalSwipeOwnerGesture } from "@/common/horizontal-swipe-owner";
import { hasClippedStart, wasAtEnd } from "./scroll-cue";
import {
  AXIS_FONT_SIZE,
  ChartLegend,
  LEFT_PADDING,
  getChromeStyles,
} from "./chart-chrome";

type ScrollableAxisChartProps = {
  /** Plot height in pixels, insets included. */
  chartHeight: number;
  /** Width of the scrolling plot (columns × column width). */
  plotWidth: number;
  /** Tick values for the y-axis labels and grid lines. */
  yTicks: number[];
  /** Value → y pixel; the same scale the plot children drew with. */
  yScale: (value: number) => number;
  /** Currency code; ticks show its symbol, or the code when it has none. */
  currency: string;
  axisWidth?: number;
  /** Screen-reader text alternative for the chart series. */
  accessibilityLabel?: string;
  /** `LegendItem`s for the row under the plot. */
  legend: ReactNode;
  /** The plot-specific SVG: bars, lines, dots, x-axis labels. */
  children: ReactNode;
};

/**
 * The scrollable shell shared by the axis bar charts: a fixed y-axis column so
 * tick labels stay put while the plot scrolls, a horizontal `ScrollView` that
 * opens long spans on the most recent periods, the y grid lines and solid zero
 * baseline, the legend row, and the swipe-ownership wrap.
 *
 * The plot itself deliberately stays in each chart — budget draws
 * favorable-tinted bars plus a dashed step line, income/expense draws grouped
 * bars plus a net line — so this component stops precisely at the shell
 * (`chart-chrome.tsx` holds the same line for the placeholder and legend).
 */
export function ScrollableAxisChart({
  chartHeight,
  plotWidth,
  yTicks,
  yScale,
  currency,
  axisWidth = LEFT_PADDING,
  accessibilityLabel,
  legend,
  children,
}: ScrollableAxisChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  // Axis amounts abbreviate in the app's language (w21/177).
  const { locale } = useTranslations();
  const styles = useThemeStyle(getChromeStyles);
  const swipeOwner = useHorizontalSwipeOwnerGesture();
  const scrollRef = useRef<ScrollView>(null);
  const zeroY = yScale(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const clipped = hasClippedStart(plotWidth, viewportWidth, offsetX);

  return (
    // Owner marker: horizontal drags belong to the plot's scroller (and to the
    // header and legend around it), never to the ledger drawer's edge swipe.
    <GestureDetector gesture={swipeOwner}>
      <View accessible accessibilityLabel={accessibilityLabel}>
        <View style={styles.row}>
          {/* Fixed y-axis so tick labels stay put while the plot scrolls. */}
          <Svg width={axisWidth} height={chartHeight}>
            {yTicks.map((tick: number, i: number) => (
              <SvgText
                key={`y-${i}`}
                x={axisWidth - 4}
                y={yScale(tick) + 5}
                fontSize={AXIS_FONT_SIZE}
                fill={theme.text01}
                textAnchor="end"
              >
                {formatShortMoneyWithCurrency(tick, currency, locale)}
              </SvgText>
            ))}
          </Svg>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              // A narrower or wider viewport with an unchanged plot fires no
              // content-size change: keep a chart that showed the newest period
              // on it (w21/1018).
              if (
                viewportWidth > 0 &&
                width !== viewportWidth &&
                wasAtEnd(plotWidth, viewportWidth, offsetX)
              ) {
                scrollRef.current?.scrollToEnd({ animated: false });
                setOffsetX(Math.max(0, plotWidth - width));
              }
              setViewportWidth(width);
            }}
            onScroll={(event) => setOffsetX(event.nativeEvent.contentOffset.x)}
            scrollEventThrottle={32}
            // Open long spans on the most recent periods. Fires once content is
            // measured (avoids the first-mount layout race) and again only when
            // the plot width changes (a new range/data), so it never yanks the
            // user back mid-scroll on unrelated re-renders. A no-op when it all
            // fits.
            onContentSizeChange={(width) => {
              scrollRef.current?.scrollToEnd({ animated: false });
              // The jump to the end may not report a scroll event.
              setOffsetX(Math.max(0, width - viewportWidth));
            }}
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

              {/* Solid zero baseline under the plot's own marks. */}
              <Line
                x1={0}
                x2={plotWidth}
                y1={zeroY}
                y2={zeroY}
                stroke={theme.black40}
                strokeWidth={1}
              />

              {children}
            </Svg>
          </ScrollView>

          {/* Earlier columns are off-screen to the left: say so. */}
          {clipped ? (
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.clipCue, { left: axisWidth, height: chartHeight }]}
            >
              <Ionicons name="chevron-back" size={16} color={theme.text01} />
            </View>
          ) : null}
        </View>

        <ChartLegend>{legend}</ChartLegend>
      </View>
    </GestureDetector>
  );
}
