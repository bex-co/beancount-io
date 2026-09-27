import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  TextProps,
  TextStyle,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { durations } from "@/common/theme";
import { easeDecelerate } from "@/common/theme/motion-easing";
import { LTR_PLOT } from "@/common/rtl";
import { AmountText } from "./amount-text";
import { fitFontScale, rollingGlyphs } from "./rolling-glyphs";

type RollingAmountProps = {
  /** The figure to show. */
  value: number;
  /**
   * Formatter for the displayed number — the same one a static render would
   * use, so symbol, grouping and sign match every other amount in the app.
   */
  format: (value: number) => string;
  /**
   * Whether digits roll to a new `value`. Pass `false` for a change that should
   * land at once — a chart scrub released back to its latest figure.
   */
  animate?: boolean;
  /** Roll length. Defaults to the chart entrance, which the roll runs beside. */
  duration?: number;
  /** Text style only: every glyph is its own `Text`, so layout belongs outside. */
  style?: StyleProp<TextStyle>;
} & Pick<
  // `numberOfLines` is accepted for `HERO_AMOUNT_FIT` and always holds: the
  // glyphs sit in one row that never wraps.
  TextProps,
  "numberOfLines" | "adjustsFontSizeToFit" | "minimumFontScale"
>;

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Below this a refit cannot move a pixel, and skipping it ends the layout loop. */
const SCALE_EPSILON = 0.005;

type DigitSlotProps = {
  digit: number;
  animate: boolean;
  duration: number;
  textStyle: StyleProp<TextStyle>;
};

/**
 * One digit: a 0–9 column behind a one-line window, rolled on the UI thread.
 *
 * The window is sized by a hidden copy of the digit rather than by arithmetic,
 * so Dynamic Type, the amount cap and the fit scale all land in the measured
 * height the roll steps by.
 */
function DigitSlot({ digit, animate, duration, textStyle }: DigitSlotProps) {
  const cellHeight = useSharedValue(0);
  // A slot mounted with the roll on starts from zero, so the first paint counts
  // up like the chart draws in.
  const position = useSharedValue(animate ? 0 : digit);

  useEffect(() => {
    position.value = animate
      ? withTiming(digit, { duration, easing: easeDecelerate })
      : digit;
  }, [digit, animate, duration, position]);

  const columnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -position.value * cellHeight.value }],
  }));

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      cellHeight.value = event.nativeEvent.layout.height;
    },
    [cellHeight],
  );

  return (
    <View style={styles.cell} onLayout={onLayout}>
      <AmountText style={[textStyle, styles.sizer]}>{digit}</AmountText>
      <Animated.View style={[styles.column, columnStyle]}>
        {DIGITS.map((d) => (
          <AmountText key={d} style={textStyle}>
            {d}
          </AmountText>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * A money figure whose digits roll to their value, odometer-style.
 *
 * Used for the chart headline: the digits roll up with the line's draw-in, roll
 * briefly from point to point under a scrubbing finger, and land at once when
 * the finger lifts.
 *
 * The figure is formatted once per value on the JS thread; each digit then
 * rolls on the UI thread, so React renders only when the target changes.
 * Reduce-motion needs no handling: `withTiming` defaults to
 * `ReduceMotion.System`, so digits land immediately when the setting is on.
 *
 * The row reads to VoiceOver/TalkBack as one label — the formatted figure —
 * not as the ten digits stacked behind every window.
 */
export function RollingAmount({
  value,
  format,
  animate = true,
  duration = durations.chart,
  style,
  adjustsFontSizeToFit = false,
  minimumFontScale = 0,
}: RollingAmountProps) {
  const text = format(value);
  const glyphs = useMemo(() => rollingGlyphs(text), [text]);

  // Hand-rolled `adjustsFontSizeToFit`: the outer row reports the room, the
  // inner row its own width at the current scale.
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const availableRef = useRef(0);
  const naturalRef = useRef(0);

  const refit = useCallback(() => {
    if (!adjustsFontSizeToFit) {
      return;
    }
    const next = fitFontScale(
      availableRef.current,
      naturalRef.current,
      minimumFontScale,
    );
    setScale((prev) => (Math.abs(prev - next) < SCALE_EPSILON ? prev : next));
  }, [adjustsFontSizeToFit, minimumFontScale]);

  const onFrameLayout = useCallback(
    (event: LayoutChangeEvent) => {
      availableRef.current = event.nativeEvent.layout.width;
      refit();
    },
    [refit],
  );
  const onRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      naturalRef.current = event.nativeEvent.layout.width / scaleRef.current;
      refit();
    },
    [refit],
  );

  const textStyle = useMemo(() => {
    if (scale === 1) {
      return style;
    }
    const { fontSize = 14, lineHeight } = StyleSheet.flatten(style) ?? {};
    return [
      style,
      {
        fontSize: fontSize * scale,
        ...(lineHeight === undefined
          ? null
          : { lineHeight: lineHeight * scale }),
      },
    ];
  }, [style, scale]);

  return (
    <View
      style={styles.frame}
      onLayout={onFrameLayout}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <View
        style={styles.row}
        onLayout={onRowLayout}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {glyphs.map((glyph) =>
          "digit" in glyph ? (
            <DigitSlot
              key={glyph.key}
              digit={glyph.digit}
              animate={animate}
              duration={duration}
              textStyle={textStyle}
            />
          ) : (
            <AmountText key={glyph.key} style={textStyle}>
              {glyph.text}
            </AmountText>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A row, so the inner row is measured along its main axis at its full
  // content width instead of being capped at the room it is being fitted into.
  // Mirrors with the app, which keeps the figure on the leading edge.
  frame: {
    flexDirection: "row",
  },
  // Digits read left to right in every locale, like the plot beneath them.
  row: {
    ...LTR_PLOT,
    flexDirection: "row",
    flexShrink: 0,
  },
  cell: {
    overflow: "hidden",
  },
  sizer: {
    opacity: 0,
  },
  column: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
