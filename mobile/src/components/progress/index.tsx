import { View as RNView } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/common/theme";

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
};

export const Progress = ({
  percent,
  height = 3,
  duration = 500,
  color,
  trackColor,
  rounded = false,
}: ProgressProps) => {
  const percentValue = useSharedValue(percent);
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
    percentValue.value = withTiming(percent, { duration });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent]);

  return (
    <RNView style={containerStyle}>
      <Animated.View style={animatedStyle} />
    </RNView>
  );
};

export default Progress;
