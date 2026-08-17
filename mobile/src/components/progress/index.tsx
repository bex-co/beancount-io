import { View as RNView } from "react-native";
import { useEffect } from "react";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { durations, useTheme } from "@/common/theme";
import { easeStandard } from "@/common/theme/motion-easing";

type ProgressProps = {
  percent: number;
  height?: number;
  duration?: number;
  /** Fill color; defaults to the brand primary. */
  color?: string;
  /** Track color behind the fill; defaults to the base surface. */
  trackColor?: string;
  /** Rounds both track and fill — use for standalone meters. */
  rounded?: boolean;
  /** Animate from empty on mount instead of rendering the initial value. */
  animateOnMount?: boolean;
  /** Fired once the fill has finished travelling to `percent`. */
  onComplete?: () => void;
};

export const Progress = ({
  percent,
  height = 3,
  duration = durations.base,
  color,
  trackColor,
  rounded = false,
  animateOnMount = false,
  onComplete,
}: ProgressProps) => {
  // Most meters represent state that already exists and should render at that
  // state on mount. The logout dwell is the exception: its fill is the feedback,
  // so it explicitly opts into travelling from empty.
  const percentValue = useSharedValue(animateOnMount ? 0 : percent);
  const theme = useTheme().colorTheme;
  const fillColor = color ?? theme.primary;
  // Composed inline rather than through `useThemeStyle`: that hook freezes the
  // factory in a ref, so a closure over props would keep first-render values
  // and never pick up a prop or theme change.
  const containerStyle = {
    backgroundColor: trackColor ?? theme.white,
    height,
    width: "100%" as const,
    borderRadius: rounded ? height / 2 : 0,
    overflow: "hidden" as const,
  };
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(percentValue.value, 100)}%`,
    backgroundColor: fillColor,
    height,
  }));

  useEffect(() => {
    const done = onComplete;
    percentValue.value = withTiming(
      percent,
      { duration, easing: easeStandard },
      (finished) => {
        // `withTiming` honours the OS reduce-motion setting, so with it on this
        // lands immediately — and anything waiting on the bar is released then
        // rather than sitting through a wait it can no longer see.
        if (finished && done) {
          runOnJS(done)();
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent]);

  return (
    <RNView style={containerStyle}>
      <Animated.View style={animatedStyle} />
    </RNView>
  );
};

export default Progress;
