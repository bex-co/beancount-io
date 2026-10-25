import { View } from "react-native";
import Svg, { Text as SvgText, G, Line } from "react-native-svg";
import { scaleLinear } from "d3-scale";
import { contentPadding } from "@/common/screen-util";
import { useChartWidth } from "./use-chart-width";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatShortMoneyWithCurrency } from "@/common/number-utils";
import { AnimatedBar } from "./animated-bar";
import { useEntranceProgress } from "./use-entrance-progress";
import { barChartValueDomain } from "./bar-chart-domain";
import { restingBarRect } from "./bar-geometry";
import { barChartLayout } from "./bar-chart-layout";
import { ChartErrorBoundary } from "./chart-chrome";

type BarChartProps = {
  labels: string[];
  numbers: number[];
  /** Currency code; ticks show its symbol, or the code when it has none. */
  currency: string;
  /**
   * What the chart says, spoken as one element: without it VoiceOver stops on
   * each axis tick and caption and never hears the amounts (w21/018).
   */
  accessibilityLabel: string;
};

/**
 * Rendered height of the plot. Exported so a caller's loading skeleton can be
 * sized from the real number instead of a copy of it — the spending card's
 * skeleton and this chart had already drifted 20px apart.
 */
export const BAR_CHART_HEIGHT = 220;

function BarChart({
  labels,
  numbers,
  currency,
  accessibilityLabel,
}: BarChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t, locale } = useTranslations();

  // Chart dimensions — measured from the container, so an iPad rotation
  // or Split View resize re-lays the bars instead of keeping the launch
  // width (w21/1004).
  const { width: chartWidth, onLayout } = useChartWidth(contentPadding * 2);
  const chartHeight = BAR_CHART_HEIGHT;
  const axisFontSize = 12;
  const labelFontSize = 13;
  const bottomPadding = 30;
  const topPadding = 20;

  const yScale = scaleLinear()
    .domain(barChartValueDomain(numbers))
    .range([chartHeight - bottomPadding, topPadding])
    .nice();

  // Y axis ticks
  const yTicks = yScale.ticks(5);
  const tickLabels = yTicks.map((tick) =>
    formatShortMoneyWithCurrency(tick, currency, locale),
  );
  // The gutter fits the widest formatted tick; bars share what remains.
  const { axisWidth, barWidth, barX, labelX } = barChartLayout(
    chartWidth,
    tickLabels,
    labels.length,
    axisFontSize,
  );

  // Loop-invariant: the baseline every bar grows from, hoisted out of the map
  // the way the two sibling charts already do it.
  const zeroY = yScale(0);

  const entrance = useEntranceProgress(numbers.length > 0);

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
    >
      <Svg width={chartWidth} height={chartHeight}>
        {/* Y axis grid lines and labels */}
        {yTicks.map((tick: number, i: number) => (
          <G key={i}>
            <Line
              x1={axisWidth}
              x2={chartWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke={theme.black40}
              strokeDasharray="4,2"
              strokeWidth={1}
            />
            <SvgText
              x={axisWidth - 4}
              y={yScale(tick) + 5}
              fontSize={axisFontSize}
              fill={theme.text01}
              textAnchor="end"
            >
              {tickLabels[i]}
            </SvgText>
          </G>
        ))}

        {/* Bars */}
        {numbers.map((num, i) => {
          const { y: barY, height: barHeight } = restingBarRect(
            num,
            yScale(num),
            zeroY,
          );

          return (
            <AnimatedBar
              key={i}
              x={barX(i)}
              y={barY}
              width={barWidth}
              height={Math.abs(barHeight)}
              baselineY={zeroY}
              fill={theme.primary}
              rx={3}
              progress={entrance}
              index={i}
              count={numbers.length}
            />
          );
        })}

        {/* X axis labels */}
        {labels.map((label, i) => (
          <SvgText
            key={i}
            x={labelX(i)}
            y={chartHeight - 8}
            fontSize={labelFontSize}
            fill={theme.text01}
            textAnchor="middle"
          >
            {t(label)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export const BarChartD3 = (props: BarChartProps) => {
  return (
    <ChartErrorBoundary>
      <BarChart {...props} />
    </ChartErrorBoundary>
  );
};
