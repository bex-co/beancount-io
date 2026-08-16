import { useCallback, useEffect, useRef } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ColorTheme } from "@/types/theme-props";
import { haptics } from "@/common/haptics";
import { durations, fontSizes, fontWeights, space } from "@/common/theme";
import { easeStandard } from "@/common/theme/motion-easing";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

export type PillOption<T extends string> = {
  key: T;
  label: string;
};

type TimeRangePillsProps<T extends string> = {
  value: T;
  options: PillOption<T>[];
  onChange: (key: T) => void;
};

type PillLayout = { x: number; y: number; width: number; height: number };

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: space.sm,
    },
    // Pill internals are a self-contained segmented control; these compact
    // metrics are intentional and not part of the shared spacing scale.
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      marginHorizontal: 3,
    },
    // The selected pill's fill is the sliding indicator below, not a style on
    // the pill itself — otherwise the fill would teleport while the indicator
    // travelled.
    indicator: {
      position: "absolute",
      borderRadius: 14,
      backgroundColor: theme.primary,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    labelActive: {
      color: theme.white,
    },
  });

/**
 * Robinhood-style row of time-range pills (a small segmented control). Generic
 * over the option key so it can drive any chart's range selection.
 *
 * The selected pill is marked by a single indicator that slides between
 * positions rather than a background that switches pills instantly. Positions
 * are measured with `onLayout` instead of assumed: the labels are localized and
 * "YTD"/"ALL" are different widths in different locales, so an even-split
 * calculation would drift off the pills in most of the app's 13 languages.
 */
export function TimeRangePills<T extends string>({
  value,
  options,
  onChange,
}: TimeRangePillsProps<T>): JSX.Element {
  const styles = useThemeStyle(getStyles);

  const layouts = useRef<Partial<Record<T, PillLayout>>>({});
  // False until the indicator has been placed at least once, so the first
  // placement snaps into position instead of sliding in from the left edge.
  const placedRef = useRef(false);

  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const y = useSharedValue(0);
  const height = useSharedValue(0);
  // Hidden until measured — otherwise a zero-width pill flashes at the origin
  // on first mount.
  const opacity = useSharedValue(0);

  const moveTo = useCallback(
    (key: T, animate: boolean) => {
      const layout = layouts.current[key];
      if (!layout) {
        return;
      }
      // Vertical metrics never differ between pills, so they are set outright.
      y.value = layout.y;
      height.value = layout.height;
      opacity.value = 1;

      if (!animate) {
        x.value = layout.x;
        width.value = layout.width;
        placedRef.current = true;
        return;
      }
      const config = { duration: durations.fast, easing: easeStandard };
      x.value = withTiming(layout.x, config);
      width.value = withTiming(layout.width, config);
    },
    [x, y, width, height, opacity],
  );

  // Covers a selection driven from outside (a parent resetting the range), and
  // the first placement once the active pill has been measured.
  useEffect(() => {
    moveTo(value, placedRef.current);
  }, [value, moveTo]);

  const handleLayout = (key: T) => (event: LayoutChangeEvent) => {
    layouts.current[key] = event.nativeEvent.layout;
    if (key === value) {
      moveTo(key, placedRef.current);
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: height.value,
    top: y.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={styles.row}>
      {/* First child so it paints behind the labels. */}
      <Animated.View
        style={[styles.indicator, indicatorStyle]}
        pointerEvents="none"
      />
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={styles.pill}
            onLayout={handleLayout(option.key)}
            onPress={() => {
              if (!active) {
                haptics.selection();
                // Move on press rather than waiting for `value` to come back
                // down: the indicator should already be travelling by the time
                // the parent re-renders.
                moveTo(option.key, true);
              }
              onChange(option.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
