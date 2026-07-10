import { useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { scaleLinear } from "d3-scale";
import { line as d3Line, area as d3Area, curveMonotoneX } from "d3-shape";
import * as Haptics from "expo-haptics";
import { ErrorBoundary } from "react-error-boundary";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatSignedMoney } from "@/common/number-utils";
import { ColorTheme } from "@/types/theme-props";

type InteractiveLineChartProps = {
  /** Static header label shown when not scrubbing (e.g. "Net Worth"). */
  label: string;
  labels: string[];
  numbers: number[];
  currencySymbol: string;
  height?: number;
  /** Called when the user starts scrubbing — lets the parent lock a pager. */
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

const CHART_HEIGHT = 190;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    label: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    headline: {
      fontSize: fontSizes.display,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    change: {
      marginTop: 2,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
    },
    chartContainer: {
      position: "relative",
    },
  });

function triggerHaptic(): void {
  // Fire-and-forget; haptics are best-effort polish.
  Haptics.selectionAsync().catch(() => undefined);
}

function InteractiveLineChart({
  label,
  labels,
  numbers,
  currencySymbol,
  height = CHART_HEIGHT,
  onScrubStart,
  onScrubEnd,
}: InteractiveLineChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  const chartWidth = ScreenWidth - contentPadding * 2;
  const count = numbers.length;
  const hasSeries = count > 1;

  // Active scrub index (null when the finger is lifted).
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);

  const { xFor, yFor, linePath, areaPath, baselineY } = useMemo(() => {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    // Pad the domain a touch so the line breathes vertically.
    const pad = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1;
    const yScale = scaleLinear()
      .domain([min - pad, max + pad])
      .range([height - PAD_BOTTOM, PAD_TOP]);
    const x = (i: number) =>
      count <= 1
        ? chartWidth / 2
        : PAD_X + (i / (count - 1)) * (chartWidth - PAD_X * 2);
    const y = (v: number) => yScale(v);

    const linePathValue =
      d3Line<number>()
        .x((_, i) => x(i))
        .y((v) => y(v))
        .curve(curveMonotoneX)(numbers) ?? "";
    const areaPathValue =
      d3Area<number>()
        .x((_, i) => x(i))
        .y0(height - PAD_BOTTOM)
        .y1((v) => y(v))
        .curve(curveMonotoneX)(numbers) ?? "";

    return {
      xFor: x,
      yFor: y,
      linePath: linePathValue,
      areaPath: areaPathValue,
      baselineY: y(numbers[0]),
    };
  }, [numbers, count, chartWidth, height]);

  const baseline = numbers[0] ?? 0;
  const shownIndex = scrubIndex ?? count - 1;
  const shownValue = numbers[shownIndex] ?? 0;
  const isUp = shownValue >= baseline;
  const lineColor = isUp ? theme.success : theme.error;

  const change = shownValue - baseline;
  const changePct = baseline !== 0 ? (change / Math.abs(baseline)) * 100 : 0;
  const changeText = `${formatSignedMoney(change, currencySymbol, true)} (${
    change >= 0 ? "+" : ""
  }${changePct.toFixed(2)}%)`;

  const indexFromTouch = (event: GestureResponderEvent): number => {
    const x = event.nativeEvent.locationX;
    const clamped = Math.max(PAD_X, Math.min(chartWidth - PAD_X, x));
    const ratio = (clamped - PAD_X) / (chartWidth - PAD_X * 2);
    return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
  };

  const updateScrub = (event: GestureResponderEvent) => {
    const index = indexFromTouch(event);
    if (index !== lastIndexRef.current) {
      lastIndexRef.current = index;
      setScrubIndex(index);
      triggerHaptic();
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => hasSeries,
        onMoveShouldSetPanResponder: () => hasSeries,
        onPanResponderGrant: (event) => {
          onScrubStart?.();
          updateScrub(event);
        },
        onPanResponderMove: (event) => updateScrub(event),
        onPanResponderRelease: () => {
          lastIndexRef.current = null;
          setScrubIndex(null);
          onScrubEnd?.();
        },
        onPanResponderTerminate: () => {
          lastIndexRef.current = null;
          setScrubIndex(null);
          onScrubEnd?.();
        },
      }),
    // Recreate only when the series identity or handlers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasSeries, count, chartWidth],
  );

  const headerTop =
    scrubIndex !== null ? t(labels[scrubIndex] ?? label) : label;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>{headerTop}</Text>
        <AmountText style={styles.headline}>
          {formatSignedMoney(shownValue, currencySymbol)}
        </AmountText>
        {hasSeries && (
          <AmountText style={[styles.change, { color: lineColor }]}>
            {changeText}
          </AmountText>
        )}
      </View>

      <View
        style={[styles.chartContainer, { width: chartWidth, height }]}
        {...panResponder.panHandlers}
      >
        <Svg width={chartWidth} height={height}>
          <Defs>
            <LinearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity={0.22} />
              <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {hasSeries && <Path d={areaPath} fill="url(#netWorthFill)" />}

          {/* Dashed baseline at the period-start value */}
          {hasSeries && (
            <Line
              x1={PAD_X}
              x2={chartWidth - PAD_X}
              y1={baselineY}
              y2={baselineY}
              stroke={theme.black40}
              strokeDasharray="4,3"
              strokeWidth={1}
            />
          )}

          {hasSeries && (
            <Path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth={2.5}
            />
          )}

          {/* Scrub cursor: vertical guide + dot on the line */}
          {scrubIndex !== null && (
            <>
              <Line
                x1={xFor(scrubIndex)}
                x2={xFor(scrubIndex)}
                y1={PAD_TOP}
                y2={height - PAD_BOTTOM}
                stroke={theme.black40}
                strokeWidth={1}
              />
              <Circle
                cx={xFor(scrubIndex)}
                cy={yFor(numbers[scrubIndex])}
                r={5}
                fill={lineColor}
                stroke={theme.white}
                strokeWidth={2}
              />
            </>
          )}

          {/* Resting end dot showing the latest value */}
          {hasSeries && scrubIndex === null && (
            <Circle
              cx={xFor(count - 1)}
              cy={yFor(numbers[count - 1])}
              r={4}
              fill={lineColor}
              stroke={theme.white}
              strokeWidth={2}
            />
          )}
        </Svg>
      </View>
    </View>
  );
}

export const InteractiveLineChartD3 = (props: InteractiveLineChartProps) => {
  return (
    <ErrorBoundary
      fallback={null}
      onError={(error) => {
        console.error(error);
      }}
    >
      <InteractiveLineChart {...props} />
    </ErrorBoundary>
  );
};
