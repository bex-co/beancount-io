import { View } from "react-native";
import Svg, { Text as SvgText, G, Line } from "react-native-svg";
import { scaleBand, scaleLinear } from "d3-scale";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatShortMoneyWithCurrency } from "@/common/number-utils";
import { AnimatedBar } from "./animated-bar";
import { useEntranceProgress } from "./use-entrance-progress";
import { barChartValueDomain } from "./bar-chart-domain";
import { restingBarRect } from "./bar-geometry";
import { ChartErrorBoundary } from "./chart-chrome";

type BarChartProps = {
  labels: string[];
  numbers: number[];
  /** Currency code; ticks show its symbol, or the code when it has none. */
  currency: string;
};

/**
 * Rendered height of the plot. Exported so a caller's loading skeleton can be
 * sized from the real number instead of a copy of it — the spending card's
 * skeleton and this chart had already drifted 20px apart.
 */
export const BAR_CHART_HEIGHT = 220;

function BarChart({ labels, numbers, currency }: BarChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  // Chart dimensions
  const chartWidth = ScreenWidth - contentPadding * 2;
  const chartHeight = BAR_CHART_HEIGHT;
  const barWidth = labels.length > 0 ? (chartWidth / labels.length) * 0.6 : 0;
  const axisFontSize = 12;
  const labelFontSize = 13;
  const leftPadding = 50;
  const bottomPadding = 30;
  const topPadding = 20;

  // Scales
  const xScale = scaleBand()
    .domain(labels)
    .range([leftPadding, chartWidth])
    .padding(0.2);

  const yScale = scaleLinear()
    .domain(barChartValueDomain(numbers))
    .range([chartHeight - bottomPadding, topPadding])
    .nice();

  // Y axis ticks
  const yTicks = yScale.ticks(5);

  // Loop-invariant: the baseline every bar grows from, hoisted out of the map
  // the way the two sibling charts already do it.
  const zeroY = yScale(0);

  const entrance = useEntranceProgress(numbers.length > 0);

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Y axis grid lines and labels */}
        {yTicks.map((tick: number, i: number) => (
          <G key={i}>
            <Line
              x1={leftPadding}
              x2={chartWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke={theme.black40}
              strokeDasharray="4,2"
              strokeWidth={1}
            />
            <SvgText
              x={leftPadding - 4}
              y={yScale(tick) + 5}
              fontSize={axisFontSize}
              fill={theme.text01}
              textAnchor="end"
            >
              {formatShortMoneyWithCurrency(tick, currency)}
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
              x={xScale(labels[i]) ?? 0}
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
            x={(xScale(label) ?? 0) + barWidth / 2}
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
