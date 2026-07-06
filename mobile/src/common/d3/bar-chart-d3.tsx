import { View } from "react-native";
import Svg, { Rect, Text as SvgText, G, Line } from "react-native-svg";
import { scaleBand, scaleLinear } from "d3-scale";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { shortNumber } from "@/common/number-utils";
import { ErrorBoundary } from "react-error-boundary";

type BarChartProps = {
  labels: string[];
  numbers: number[];
  currencySymbol: string;
};

function BarChart({
  labels,
  numbers,
  currencySymbol,
}: BarChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  // Chart dimensions
  const chartWidth = ScreenWidth - contentPadding * 2;
  const chartHeight = 220;
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

  const maxValue = Math.max(...numbers, 1);
  const minValue = Math.min(...numbers, 0);

  const yScale = scaleLinear()
    .domain([minValue, maxValue])
    .range([chartHeight - bottomPadding, topPadding])
    .nice();

  // Y axis ticks
  const yTicks = yScale.ticks(5);

  return (
    <View>
      <Svg
        width={chartWidth}
        height={chartHeight}
        // style={{ backgroundColor: "blue" }}
      >
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
              {`${currencySymbol}${shortNumber(tick)}`}
            </SvgText>
          </G>
        ))}

        {/* Bars */}
        {numbers.map((num, i) => {
          const zeroY = yScale(0);
          const valueY = yScale(num);
          const minHeight = 2; // Minimum height for visibility

          // Calculate bar height and position
          let barHeight: number;
          let barY: number;

          if (num >= 0) {
            // Positive values: bar goes from value to zero
            barHeight = zeroY - valueY;
            barY = valueY;
          } else {
            // Negative values: bar goes from zero to value
            barHeight = valueY - zeroY;
            barY = zeroY;
          }

          // Ensure minimum height for visibility
          if (Math.abs(barHeight) < minHeight) {
            barHeight = num >= 0 ? minHeight : -minHeight;
            barY = num >= 0 ? zeroY - minHeight : zeroY;
          }

          return (
            <Rect
              key={i}
              x={xScale(labels[i]) ?? 0}
              y={barY}
              width={barWidth}
              height={Math.abs(barHeight)}
              fill={theme.primary}
              rx={3}
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
    <ErrorBoundary
      fallback={null}
      onError={(error) => {
        console.error(error);
      }}
    >
      <BarChart {...props} />
    </ErrorBoundary>
  );
};
