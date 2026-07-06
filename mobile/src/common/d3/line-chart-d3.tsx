import { View } from "react-native";
import Svg, { Path, Circle, Text as SvgText, G, Line } from "react-native-svg";
import { scaleLinear, scalePoint } from "d3-scale";
import { line as d3Line, curveMonotoneX } from "d3-shape";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { shortNumber } from "@/common/number-utils";
import { generateTicks } from "@/common/d3/utils";
import { ErrorBoundary } from "react-error-boundary";

type LineChartProps = {
  labels: string[];
  numbers: number[];
  currencySymbol: string;
};

function LineChart({
  labels,
  numbers,
  currencySymbol,
}: LineChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  // Chart dimensions
  const chartWidth = ScreenWidth - contentPadding * 2;
  const chartHeight = 220;
  const axisFontSize = 12;
  const labelFontSize = 12;
  const leftPadding = 50;
  const bottomPadding = 30;
  const topPadding = 20;

  // Scales
  const xScale = scalePoint()
    .domain(labels)
    .range([leftPadding, chartWidth])
    .padding(0.5);

  const minValue = Math.min(...numbers, 0);
  const maxValue = Math.max(...numbers, 1);
  const yScale = scaleLinear()
    .domain([minValue, maxValue])
    .range([chartHeight - bottomPadding, topPadding])
    .nice();

  // Y axis ticks
  const yTicks = generateTicks(minValue, maxValue, 5);

  // Line path
  const linePath = d3Line<number>()
    .x((_, i) => xScale(labels[i]) ?? 0)
    .y((d) => yScale(d))
    .curve(curveMonotoneX)(numbers);

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
              {`${currencySymbol}${shortNumber(tick)}`}
            </SvgText>
          </G>
        ))}

        {/* Line path */}
        {linePath && (
          <Path
            d={linePath}
            fill="none"
            stroke={theme.primary}
            strokeWidth={3}
          />
        )}

        {/* Data points */}
        {numbers.map((num, i) => (
          <Circle
            key={i}
            cx={xScale(labels[i]) ?? 0}
            cy={yScale(num)}
            r={6}
            stroke={theme.primary}
            strokeWidth={2}
            fill={theme.white}
          />
        ))}

        {/* X axis labels */}
        {labels.map((label, i) => (
          <SvgText
            key={i}
            x={xScale(label) ?? 0}
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

export const LineChartD3 = (props: LineChartProps) => {
  return (
    <ErrorBoundary
      fallback={null}
      onError={(error) => {
        console.error(error);
      }}
    >
      <LineChart {...props} />
    </ErrorBoundary>
  );
};
