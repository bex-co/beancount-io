import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  SharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { scaleLinear } from "d3-scale";
import { line as d3Line, area as d3Area, curveMonotoneX } from "d3-shape";
import { haptics } from "@/common/haptics";
import { useHorizontalSwipeOwnerGesture } from "@/common/horizontal-swipe-owner";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { durations, fontSizes, fontWeights, useTheme } from "@/common/theme";
import { easeStandard } from "@/common/theme/motion-easing";
import { AmountText, AnimatedAmount } from "@/components/amount-text";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatSignedMoneyWithCurrency } from "@/common/number-utils";
import { ColorTheme } from "@/types/theme-props";
import { polylineLength } from "./utils";
import { useEntranceProgress } from "./use-entrance-progress";
import { lerp, lerpSeries, resampleSeries, sameSeries } from "./series-morph";
import {
  SCRUB_IDLE,
  activeScrubIndex,
  scrubIndexForX,
  scrubbedValue,
  shouldTickHaptic,
  shownScrubIndex,
} from "./scrub";
import { LEADING_TEXT_ALIGN, LTR_PLOT } from "@/common/rtl";
import { ChartErrorBoundary } from "./chart-chrome";

// Created once at module scope: building these inside the component would give
// React a new component type on every render and remount the node each time.
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Module scope for the same reason the animated components are: `scheduleOnRN`
// captures the function into the worklet, and a fresh closure per render would
// re-upload the gesture's worklets on every re-render.
const fireTouchInHaptic = () => haptics.press();
const fireScrubTick = () => haptics.selection();

type InteractiveLineChartProps = {
  /**
   * Static heading above the value (e.g. "Net Worth"). Stays put while
   * scrubbing. Omit when the surrounding card already carries a title, so the
   * heading isn't duplicated.
   */
  label?: string;
  labels: string[];
  numbers: number[];
  /**
   * Currency code (e.g. "USD", "MUSD"). The headline and change use its symbol
   * when one is known, otherwise the code is appended after the amount.
   */
  currency: string;
  height?: number;
  /**
   * Shown in the middle of the plot when there aren't two points to draw a line
   * from (an empty ledger, or one with a single month of history). Defaults to
   * a generic "not enough data" line.
   */
  placeholder?: string;
};

const CHART_HEIGHT = 190;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;

/**
 * Steps precomputed for a range-to-range morph. Twenty-four distinct positions
 * across the transition reads as continuous (it is film's frame rate) while
 * keeping the work — and the string payload copied to the UI thread — bounded.
 */
const MORPH_FRAMES = 24;

type Domain = readonly [number, number];

/**
 * Padded y-domain for a series. The padding stops a flat-ish curve from
 * hugging the top and bottom edges of the plot.
 */
function computeDomain(values: number[]): Domain {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1;
  return [min - pad, max + pad];
}

type ChartGeometry = {
  chartWidth: number;
  height: number;
};

/**
 * Line and area path strings for a series under a given domain.
 *
 * Shared by the resting render and by every morph frame, so an intermediate
 * frame is built by exactly the same code as the resting one. (Matching the
 * endpoints exactly takes one more step — see `buildMorphFrames`.)
 *
 * Stays on the JS thread by necessity: d3's scales and shape generators are
 * closures over class instances, and the worklet serializer copies neither.
 */
function buildPaths(
  values: number[],
  domain: Domain,
  { chartWidth, height }: ChartGeometry,
): {
  linePath: string;
  areaPath: string;
  xFor: (i: number) => number;
  yFor: (v: number) => number;
} {
  const count = values.length;
  const yScale = scaleLinear()
    .domain([domain[0], domain[1]])
    .range([height - PAD_BOTTOM, PAD_TOP]);
  const x = (i: number) =>
    count <= 1
      ? chartWidth / 2
      : PAD_X + (i / (count - 1)) * (chartWidth - PAD_X * 2);
  const y = (v: number) => yScale(v);

  return {
    xFor: x,
    yFor: y,
    linePath:
      d3Line<number>()
        .x((_, i) => x(i))
        .y((v) => y(v))
        .curve(curveMonotoneX)(values) ?? "",
    areaPath:
      d3Area<number>()
        .x((_, i) => x(i))
        .y0(height - PAD_BOTTOM)
        .y1((v) => y(v))
        .curve(curveMonotoneX)(values) ?? "",
  };
}

type MorphFrames = {
  line: string[];
  area: string[];
  /** The resampled endpoints, kept so a mid-flight retarget can start from
   *  whatever curve is currently on screen rather than from where this
   *  transition began. */
  fromGrid: number[];
  toGrid: number[];
};

/** Stable empty arrays, so a non-morphing render keeps one closure identity. */
const NO_FRAMES: string[] = [];

/**
 * Dash length used while morphing. The entrance draws the line by shortening a
 * dash the exact length of the path; a morph has no such need, but the dash
 * prop cannot be removed mid-flight without iOS dropping the transition (see
 * the entrance comment below). A dash longer than any path the chart could
 * produce leaves the stroke solid, whatever an intermediate frame's length is.
 */
const MORPH_DASH = 100000;

/**
 * Every intermediate path between two series, blended in both value and
 * domain space so the curve and its axis rescale together. Interpolating only
 * the values would make the line slide while the (invisible) scale snapped,
 * which reads as the chart lurching at the start of the transition.
 */
function buildMorphFrames(
  from: number[],
  to: number[],
  geometry: ChartGeometry,
): MorphFrames {
  const gridSize = Math.max(from.length, to.length);
  const fromGrid = resampleSeries(from, gridSize);
  const toGrid = resampleSeries(to, gridSize);
  const fromDomain = computeDomain(from);
  const toDomain = computeDomain(to);

  const line: string[] = [];
  const area: string[] = [];
  for (let i = 0; i < MORPH_FRAMES; i++) {
    const t = i / (MORPH_FRAMES - 1);
    const paths = buildPaths(
      lerpSeries(fromGrid, toGrid, t),
      [
        lerp(fromDomain[0], toDomain[0], t),
        lerp(fromDomain[1], toDomain[1], t),
      ],
      geometry,
    );
    line.push(paths.linePath);
    area.push(paths.areaPath);
  }

  // Pin the endpoints to the real resting paths. Every interior frame is drawn
  // from a resampled grid, and a monotone cubic through a denser set of points
  // is not quite the same curve as one through the originals — close enough to
  // blend, but enough to pop on the handoff back to the static render. The two
  // frames that have to match something else exactly are overwritten with the
  // thing they have to match.
  const restingFrom = buildPaths(from, fromDomain, geometry);
  const restingTo = buildPaths(to, toDomain, geometry);
  line[0] = restingFrom.linePath;
  area[0] = restingFrom.areaPath;
  line[MORPH_FRAMES - 1] = restingTo.linePath;
  area[MORPH_FRAMES - 1] = restingTo.areaPath;

  return { line, area, fromGrid, toGrid };
}

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    // Both hold amounts and currency codes (`0.00 MUSD` — Latin), so the
    // default `natural` alignment pinned them to the left of a Persian card
    // while `changeRow` beneath them mirrored to the right, splitting one
    // heading across both edges. See `LEADING_TEXT_ALIGN` for why the value is
    // spelled `"left"`.
    label: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
    headline: {
      fontSize: fontSizes.display,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    changeRow: {
      marginTop: 2,
      flexDirection: "row",
      alignItems: "center",
    },
    change: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
    },
    // Muted so the month reads as context for the change, not as a second
    // figure competing with it.
    scrubLabel: {
      marginStart: 6,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    chartContainer: {
      position: "relative",
      ...LTR_PLOT,
    },
    // Centered over the plot area, which is empty whenever a line can't be drawn.
    placeholder: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    placeholderText: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
  });

type ScrubHeaderProps = {
  labels: string[];
  numbers: number[];
  currency: string;
  /** Trend color for the change row, resolved by the chart so the line and the figure can never disagree. */
  color: string;
  scrub: SharedValue<number>;
};

/**
 * The figure under the finger: headline value, change against the period start,
 * and the scrubbed month.
 *
 * Its own component, and that is the point. Text is the one part of a scrub
 * React still has to draw — the alternative, an animated `TextInput` `value`,
 * was weighed and rejected for this headline in `w1/m20/t003`: it announces
 * itself to VoiceOver as an editable field, and driving it would put a second
 * copy of the currency-formatting rules on the UI thread to drift from
 * `number-utils`. So the render stays, and what changes is its blast radius.
 * Subscribing here rather than in the chart keeps it to three `Text` nodes
 * instead of the whole card — crucially not the sibling `<Svg>`, where any
 * prop change repaints every node in the tree.
 *
 * It is also gated on the *index*, not the frame: the state only moves when the
 * cursor crosses to another data point, so there is no frame on which this
 * re-renders and the pixels come out the same.
 */
function ScrubHeader({
  labels,
  numbers,
  currency,
  color,
  scrub,
}: ScrubHeaderProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  const [index, setIndex] = useState(SCRUB_IDLE);
  useAnimatedReaction(
    () => scrub.value,
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(setIndex, current);
      }
    },
  );

  const count = numbers.length;
  const shownIndex = shownScrubIndex(index, count);
  const shownValue = scrubbedValue(numbers, index);
  const scrubbing = index !== SCRUB_IDLE && count > 0;

  // Same formatter the resting frame uses, so the counting frames and the final
  // one differ only in the number.
  const formatHeadline = useCallback(
    (value: number) => formatSignedMoneyWithCurrency(value, currency),
    [currency],
  );

  const baseline = numbers[0] ?? 0;
  const change = shownValue - baseline;
  const changePct = baseline !== 0 ? (change / Math.abs(baseline)) * 100 : 0;
  const changeText = `${formatSignedMoneyWithCurrency(change, currency, true)} (${
    change >= 0 ? "+" : ""
  }${changePct.toFixed(2)}%)`;

  // The heading stays put while scrubbing: where it is the card's only title,
  // swapping it for a month would leave the card unlabeled mid-gesture. The
  // scrubbed month rides along with the change row instead, where it reads as
  // "period start → this month" rather than as a replacement identity.
  const scrubLabel =
    scrubbing && labels[shownIndex] !== undefined
      ? t(labels[shownIndex])
      : null;

  return (
    <>
      <AnimatedAmount
        value={shownValue}
        format={formatHeadline}
        // Bypassed while a finger is down: a scrubbed figure has to land on
        // the exact point under the touch, and a tween there reads as lag.
        animate={!scrubbing}
        style={styles.headline}
      />
      <View style={styles.changeRow}>
        <AmountText style={[styles.change, { color }]}>{changeText}</AmountText>
        {scrubLabel !== null && (
          <Text style={styles.scrubLabel}>{`· ${scrubLabel}`}</Text>
        )}
      </View>
    </>
  );
}

function InteractiveLineChart({
  label,
  labels,
  numbers,
  currency,
  height = CHART_HEIGHT,
  placeholder,
}: InteractiveLineChartProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const swipeOwner = useHorizontalSwipeOwnerGesture();

  const chartWidth = ScreenWidth - contentPadding * 2;
  const count = numbers.length;
  const hasSeries = count > 1;

  // Active scrub index, `SCRUB_IDLE` when no finger is down. A shared value
  // rather than React state: the gesture writes it on the UI thread and every
  // scrub visual reads it there, so a finger moving across the plot never
  // enters React at all.
  const scrub = useSharedValue(SCRUB_IDLE);

  const geometry = useMemo(
    () => ({ chartWidth, height }),
    [chartWidth, height],
  );

  // `pointXs` / `pointYs` are the whole reason the scrub can run on the UI
  // thread: the d3 scales that produced them cannot cross to it (see
  // `buildPaths`), but two `number[]`s of plotted positions can, and indexing
  // them is all a cursor needs.
  const { linePath, areaPath, pointXs, pointYs, lineLength } = useMemo(() => {
    const paths = buildPaths(numbers, computeDomain(numbers), geometry);
    const xs = numbers.map((_, i) => paths.xFor(i));
    const ys = numbers.map((v) => paths.yFor(v));
    return {
      linePath: paths.linePath,
      areaPath: paths.areaPath,
      pointXs: xs,
      pointYs: ys,
      lineLength: polylineLength(xs, ys),
    };
  }, [numbers, geometry]);

  const baselineY = pointYs[0] ?? 0;

  // Entrance progress, 0 → 1. The stroke carries a dash as long as the whole
  // path, so animating the offset from that length down to zero walks the line
  // on from the left.
  const draw = useEntranceProgress(hasSeries);

  // Populated only while a range-to-range transition is in flight. While it is
  // empty the paths render exactly as they did before any of this existed,
  // which keeps the morph's blast radius to the transition itself.
  const [morphFrames, setMorphFrames] = useState<MorphFrames | null>(null);
  const morph = useSharedValue(1);
  const previousRef = useRef<number[] | null>(null);
  const inFlightRef = useRef<MorphFrames | null>(null);

  const clearMorph = useCallback(() => {
    inFlightRef.current = null;
    setMorphFrames(null);
  }, []);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = numbers;

    // Nothing to morph from on the very first series — that is the entrance.
    if (!previous || !hasSeries || previous.length < 2) {
      return;
    }
    // Re-renders hand back equal-but-new arrays constantly (a theme switch, a
    // parent's refetch). Only an actual change in the curve is a transition.
    if (sameSeries(previous, numbers)) {
      return;
    }

    // Retarget from whatever is on screen right now, not from where the
    // previous transition started, so a third tap mid-flight continues from
    // the curve the user is looking at instead of snapping backwards.
    const inFlight = inFlightRef.current;
    const startSeries = inFlight
      ? lerpSeries(inFlight.fromGrid, inFlight.toGrid, morph.value)
      : previous;

    const frames = buildMorphFrames(startSeries, numbers, geometry);
    inFlightRef.current = frames;
    setMorphFrames(frames);
    morph.value = 0;
    morph.value = withTiming(
      1,
      { duration: durations.chart, easing: easeStandard },
      (finished) => {
        // Only the last transition standing clears the frames; a superseded one
        // must not drop the render back to the resting path mid-flight.
        if (finished) {
          scheduleOnRN(clearMorph);
        }
      },
    );
  }, [numbers, hasSeries, geometry, morph, clearMorph]);

  const morphLine = morphFrames?.line ?? NO_FRAMES;
  const morphArea = morphFrames?.area ?? NO_FRAMES;
  const morphing = morphLine.length > 0;

  // Never zero: a zero-length dash array is not a valid stroke pattern.
  const dashLength = morphing ? MORPH_DASH : Math.max(lineLength, 1);

  const lineAnimatedProps = useAnimatedProps(() => {
    const last = morphLine.length - 1;
    return {
      strokeDashoffset: dashLength * (1 - draw.value),
      d:
        last < 0
          ? linePath
          : morphLine[
              Math.min(last, Math.max(0, Math.round(morph.value * last)))
            ],
    };
  });

  const areaAnimatedProps = useAnimatedProps(() => {
    const last = morphArea.length - 1;
    return {
      opacity: draw.value,
      d:
        last < 0
          ? areaPath
          : morphArea[
              Math.min(last, Math.max(0, Math.round(morph.value * last)))
            ],
    };
  });

  const baseline = numbers[0] ?? 0;

  // Whether the shown point is up on the period start — `null` while no finger
  // is down, so the resting direction is used.
  //
  // The one piece of the scrub that still goes through React, and deliberately.
  // The trend color reaches the gradient under the area, and a `<Stop>` renders
  // no native node at all (`Stop.render()` returns `null`; `LinearGradient`
  // flattens its children into one prop), so no animated prop can touch it.
  // What keeps that honest is the gate: this fires when the scrub *crosses the
  // baseline*, not per frame and not per point. Every render it causes is a
  // color change that had to be painted anyway.
  const [scrubUp, setScrubUp] = useState<boolean | null>(null);
  const restingUp = (numbers[count - 1] ?? 0) >= baseline;
  const lineColor = (scrubUp ?? restingUp) ? theme.success : theme.error;

  // Read off the plotted y positions rather than the values behind them: the
  // cursor worklets already hold `pointYs`, so asking it here costs no second
  // array on the UI thread — and neither call site memoizes the `numbers` prop,
  // so capturing that one would re-upload the whole series to the UI runtime on
  // every unrelated re-render of the card. SVG y grows downward, so "above the
  // period start" is the *smaller* y.
  useAnimatedReaction(
    () => {
      const index = activeScrubIndex(scrub.value, pointYs.length);
      return index === SCRUB_IDLE ? null : pointYs[index] <= baselineY;
    },
    (up, previous) => {
      if (up !== previous) {
        scheduleOnRN(setScrubUp, up);
      }
    },
  );

  // Per-data-point selection tick. `expo-haptics` is an async native module and
  // cannot run in a worklet, so the reaction decides on the UI thread and only
  // the firing hops to JS.
  useAnimatedReaction(
    () => scrub.value,
    (current, previous) => {
      if (shouldTickHaptic(previous, current)) {
        scheduleOnRN(fireScrubTick);
      }
    },
  );

  const scrubGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(hasSeries)
        // Claims the touch on contact, the way the `PanResponder` this replaces
        // did: a scrub starts at the point you put your finger on, not after a
        // threshold, and the plot keeps owning vertical drags that begin on it.
        .minDistance(0)
        // The swipe-owner marker sits on an ancestor and must stay in BEGAN for
        // the life of the touch — it is what stands the ledger drawer's edge
        // swipe down. Without this relation, activating the scrub would cancel
        // the marker and hand the drawer back a gesture mid-scrub.
        .simultaneousWithExternalGesture(swipeOwner)
        .onBegin((event) => {
          // Light impact on initial touch (Robinhood-style "tap-in" feel), and
          // no tick for the point it lands on — the impact already announced it.
          scrub.value = scrubIndexForX(event.x, chartWidth, count, PAD_X);
          scheduleOnRN(fireTouchInHaptic);
        })
        .onUpdate((event) => {
          scrub.value = scrubIndexForX(event.x, chartWidth, count, PAD_X);
        })
        // `onFinalize` rather than `onEnd`: a touch that never moved enough to
        // activate still put a cursor on the plot in `onBegin`, and it has to
        // come back off.
        .onFinalize(() => {
          scrub.value = SCRUB_IDLE;
        }),
    [hasSeries, chartWidth, count, scrub, swipeOwner],
  );

  const guideAnimatedProps = useAnimatedProps(() => {
    const index = activeScrubIndex(scrub.value, pointXs.length);
    const active = index !== SCRUB_IDLE;
    // Show/hide as opacity rather than as conditional JSX: mounting a node
    // mid-gesture is a React render, which is the thing this is avoiding.
    return {
      opacity: active ? 1 : 0,
      x1: active ? pointXs[index] : 0,
      x2: active ? pointXs[index] : 0,
    };
  });

  const cursorAnimatedProps = useAnimatedProps(() => {
    const index = activeScrubIndex(scrub.value, pointXs.length);
    const active = index !== SCRUB_IDLE;
    return {
      opacity: active ? 1 : 0,
      cx: active ? pointXs[index] : 0,
      cy: active ? pointYs[index] : 0,
    };
  });

  // The resting end dot and the cursor are never on screen together.
  const endDotAnimatedProps = useAnimatedProps(() => ({
    opacity: scrub.value === SCRUB_IDLE ? 1 : 0,
  }));

  return (
    // Owner marker covers the header/labels too, so swipes starting above the
    // plot can't be claimed by the ledger drawer's edge gesture.
    <GestureDetector gesture={swipeOwner}>
      <View>
        <View style={styles.header}>
          {label !== undefined && <Text style={styles.label}>{label}</Text>}
          <ScrubHeader
            labels={labels}
            numbers={numbers}
            currency={currency}
            color={lineColor}
            scrub={scrub}
          />
        </View>

        <GestureDetector gesture={scrubGesture}>
          <View style={[styles.chartContainer, { width: chartWidth, height }]}>
            <Svg width={chartWidth} height={height}>
              <Defs>
                <LinearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={lineColor} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {hasSeries && (
                <AnimatedPath
                  d={areaPath}
                  fill="url(#netWorthFill)"
                  animatedProps={areaAnimatedProps}
                />
              )}

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
                <AnimatedPath
                  d={linePath}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  // Numeric from the very first frame. Transitioning
                  // strokeDasharray/strokeDashoffset out of `undefined` silently
                  // does nothing on iOS, so the dash must never start unset.
                  strokeDasharray={[dashLength, dashLength]}
                  animatedProps={lineAnimatedProps}
                />
              )}

              {/* Scrub cursor: vertical guide + dot on the line. Mounted for
                  the life of the chart and hidden with opacity — a node that
                  appears when the finger lands is a React render mid-gesture. */}
              {hasSeries && (
                <>
                  <AnimatedLine
                    y1={PAD_TOP}
                    y2={height - PAD_BOTTOM}
                    stroke={theme.black40}
                    strokeWidth={1}
                    animatedProps={guideAnimatedProps}
                  />
                  <AnimatedCircle
                    r={5}
                    fill={lineColor}
                    stroke={theme.white}
                    strokeWidth={2}
                    animatedProps={cursorAnimatedProps}
                  />
                </>
              )}

              {/* Resting end dot showing the latest value */}
              {hasSeries && (
                <AnimatedCircle
                  cx={pointXs[count - 1]}
                  cy={pointYs[count - 1]}
                  r={4}
                  fill={lineColor}
                  stroke={theme.white}
                  strokeWidth={2}
                  animatedProps={endDotAnimatedProps}
                />
              )}
            </Svg>

            {!hasSeries && (
              <View style={styles.placeholder} pointerEvents="none">
                <Text style={styles.placeholderText}>
                  {placeholder ?? t("notEnoughChartData")}
                </Text>
              </View>
            )}
          </View>
        </GestureDetector>
      </View>
    </GestureDetector>
  );
}

export const InteractiveLineChartD3 = (props: InteractiveLineChartProps) => {
  return (
    <ChartErrorBoundary>
      <InteractiveLineChart {...props} />
    </ChartErrorBoundary>
  );
};
