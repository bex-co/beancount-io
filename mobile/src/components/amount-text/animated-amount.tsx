import { useEffect, useState } from "react";
import { StyleProp, TextStyle } from "react-native";
import {
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { durations } from "@/common/theme";
import { easeDecelerate } from "@/common/theme/motion-easing";
import { AmountText } from "./amount-text";

type AnimatedAmountProps = {
  /** The figure to show. */
  value: number;
  /**
   * Formatter for the displayed number. The **same** formatter the static
   * render would use — passing it in rather than formatting inside keeps the
   * counting frames byte-identical to the resting frame (symbol, grouping,
   * sign), so nothing shifts when the animation ends.
   */
  format: (value: number) => string;
  /**
   * Whether to tween towards `value`. Pass `false` for values the user is
   * directly manipulating — a scrubbed figure must track the finger exactly,
   * and a tween there reads as lag, not polish.
   */
  animate?: boolean;
  style?: StyleProp<TextStyle>;
};

/**
 * A money figure that counts to its value instead of appearing at it.
 *
 * Used for the chart headline, where the count runs alongside the line's
 * draw-in so the number and the chart arrive as one gesture rather than the
 * number popping and the chart following.
 *
 * ## Why this re-renders on the JS thread
 *
 * The usual trick for UI-thread text is an animated `TextInput` `value`, which
 * avoids React entirely. It is deliberately not used here for two reasons: a
 * `TextInput` announces itself to VoiceOver/TalkBack as an editable field,
 * which is wrong for a headline balance; and formatting inside a worklet would
 * mean a second copy of the currency-formatting rules that could drift from
 * `number-utils`.
 *
 * Instead the tween runs on the UI thread and only the rounded cent value is
 * scheduled back to JS. This component is a leaf holding one `Text`, so those
 * re-renders never reach the sibling SVG — which matters, because any prop
 * change inside an `<Svg>` repaints the whole tree.
 *
 * Reduce-motion needs no handling: `withTiming` defaults to
 * `ReduceMotion.System`, so the value lands immediately when the setting is on.
 */
export function AnimatedAmount({
  value,
  format,
  animate = true,
  style,
}: AnimatedAmountProps) {
  // Starts at zero so the first paint counts up from nothing; later changes
  // count from wherever the previous value left off.
  const displayed = useSharedValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (animate) {
      displayed.value = withTiming(value, {
        duration: durations.chart,
        easing: easeDecelerate,
      });
      return;
    }
    // Keep the tween's origin current while it is bypassed, so re-enabling it
    // (finger lifted) doesn't animate back from a stale figure.
    displayed.value = value;
  }, [value, animate, displayed]);

  useAnimatedReaction(
    // Round to cents: the formatter shows two decimals, so anything finer is a
    // re-render that cannot change a pixel.
    () => Math.round(displayed.value * 100),
    (cents, previous) => {
      if (cents !== previous) {
        scheduleOnRN(setShown, cents / 100);
      }
    },
  );

  return (
    <AmountText style={style}>{format(animate ? shown : value)}</AmountText>
  );
}
