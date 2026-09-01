import { useCallback, useMemo } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { springs } from "@/common/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * How far a control shrinks while held. Small on purpose: the press has to read
 * as the surface giving way, not as the control resizing.
 */
const PRESS_SCALE = 0.96;

/**
 * The press-down/release spring, reusable by controls that cannot be a
 * `PressableScale` themselves — the tab bar's `PlatformPressable` is an RN
 * `Animated` component and cannot take a Reanimated style, so it animates a
 * wrapper around its children with this instead.
 *
 * `springs.press` settles in well under the 300ms direct-feedback budget (see
 * `common/theme/motion.ts`), and `withSpring` honours the OS reduce-motion
 * setting on its own — with it on, the scale lands instantly and the control
 * still visibly responds.
 */
export function usePressScale(scale: number = PRESS_SCALE): {
  style: ReturnType<typeof useAnimatedStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const held = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - held.value * (1 - scale) }],
  }));

  const onPressIn = useCallback(() => {
    held.value = withSpring(1, springs.press);
  }, [held]);

  const onPressOut = useCallback(() => {
    held.value = withSpring(0, springs.press);
  }, [held]);

  // Stable across renders so a consumer's own `useCallback`s over these can
  // actually memoize.
  return useMemo(
    () => ({ style, onPressIn, onPressOut }),
    [style, onPressIn, onPressOut],
  );
}

export type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Held-down scale. Defaults to `PRESS_SCALE`. */
  scale?: number;
};

/**
 * A `Pressable` that springs down on press and back on release.
 *
 * The app's one press-feedback primitive. Everything else it does is pass
 * through: accessibility props, `hitSlop`, `disabled` and both press callbacks
 * reach the underlying `Pressable` untouched, so wrapping a control in it never
 * changes what a screen reader announces or where the touch target is.
 *
 * The `({ pressed }) => style` callback form is deliberately not supported —
 * Reanimated resolves the style prop itself and cannot call a function for it.
 * A control that also needs a pressed *color* tracks the state itself through
 * `onPressIn`/`onPressOut`, the way `Button` does.
 */
export const PressableScale = ({
  style,
  scale,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps): JSX.Element => {
  const press = usePressScale(scale);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      press.onPressIn();
      onPressIn?.(event);
    },
    [press, onPressIn],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      press.onPressOut();
      onPressOut?.(event);
    },
    [press, onPressOut],
  );

  return (
    <AnimatedPressable
      {...rest}
      style={[style, press.style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
};
