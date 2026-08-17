import { useEffect } from "react";
import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { springs } from "@/common/theme";
import { tabIconName, type TabRouteName } from "./tab-icons";

export { tabIcons, tabIconName } from "./tab-icons";
export type { TabRouteName, TabIconPair } from "./tab-icons";

/** Glyph size — matches what the tab bar rendered before the swap. */
const ICON_SIZE = 28;

/**
 * How much the icon grows when its tab takes focus. Small enough that it reads
 * as the icon acknowledging the tap rather than the tab bar resizing.
 */
const FOCUS_SCALE = 1.1;

type Props = {
  route: TabRouteName;
  /** The tint react-navigation resolved from the active/inactive tint options. */
  color: ColorValue;
  focused: boolean;
};

/**
 * A tab bar icon: outline when inactive, filled with a spring when focused.
 *
 * The spring lives here, in the tab bar's own tree, rather than in the screen.
 * Since `w1/m22/t005` tabs mount on first focus, so the first switch to a tab
 * does real work on the JS thread — mount, query, skeleton. A Reanimated spring
 * runs on the UI thread and is unaffected by that, which a JS-driven animation
 * would not be.
 *
 * `withSpring` honours the OS reduce-motion setting on its own, so with it on
 * the icon lands at its focused size instantly and the glyph still swaps.
 */
export function TabBarIcon({ route, color, focused }: Props): JSX.Element {
  // Seeded from the current state so the tab that is focused at launch does not
  // animate into place on the first frame.
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focus.value = withSpring(focused ? 1 : 0, springs.indicator);
  }, [focus, focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focus.value * (FOCUS_SCALE - 1) }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={tabIconName(route, focused)}
        size={ICON_SIZE}
        color={color}
      />
    </Animated.View>
  );
}
