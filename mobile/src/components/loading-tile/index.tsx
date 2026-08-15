import { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { loopDurations, useTheme } from "@/common/theme";
import { easeStandard } from "@/common/theme/motion-easing";
import { useReduceMotion } from "@/common/hooks/use-reduce-motion";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const styles = StyleSheet.create({
  light: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  dark: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  loadingTile: {
    overflow: "hidden",
    borderRadius: 3,
  },
});

type LoadingTileProps = {
  mx?: number;
  height?: number;
  width?: number;
  style?: ViewStyle;
};

export const LoadingTile = (props: LoadingTileProps) => {
  const { style, mx, height, width } = props;
  // Resolved theme name from the provider — themeVar itself can hold
  // "system", which must not be compared against "dark" directly.
  const theme = useTheme().name;

  const dynamicStyles: ViewStyle = {
    ...(mx && { marginHorizontal: mx }),
    ...(height && { height }),
    ...(width && { width }),
  };

  const opacity = useSharedValue(1);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    // A repeating animation is the one case Reanimated's ReduceMotion.System
    // default does not cover: it would keep looping at zero duration rather
    // than stopping, so the loop has to be skipped outright.
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    // Reversed rather than a two-step sequence back to 1 — same cycle, half the
    // animation. A full breath is two of these; the old 300ms half-cycle read
    // as a nervous throb.
    opacity.value = withRepeat(
      withTiming(0.5, {
        duration: loopDurations.pulse,
        easing: easeStandard,
      }),
      -1,
      true,
    );
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.loadingTile,
        dynamicStyles,
        theme === "dark" ? styles.dark : styles.light,
        style,
        animatedStyle,
      ]}
    />
  );
};
