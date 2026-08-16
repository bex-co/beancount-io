// As of SDK 56, expo-router vendors react-navigation; app code must import
// from expo-router/react-navigation instead of @react-navigation/*.
import { PlatformPressable } from "expo-router/react-navigation";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
// BottomTabBarButtonProps is not re-exported from expo-router/react-navigation;
// type-only import from the vendored module — erased at compile time.
import type { BottomTabBarButtonProps } from "expo-router/build/react-navigation/bottom-tabs";
import { haptics } from "@/common/haptics";
import { usePressScale } from "@/components/pressable-scale";

const styles = StyleSheet.create({
  // Mirrors what the tab item's own style does to the icon and label it
  // renders as children, so interposing this wrapper changes nothing but the
  // transform it carries.
  content: { alignItems: "center" },
});

export function HapticTab({ children, ...props }: BottomTabBarButtonProps) {
  // The tab press was the app's only haptic without a matching visual response.
  // `PlatformPressable` is an RN `Animated` component and cannot take a
  // Reanimated style, so the scale rides on a wrapper around its children
  // rather than on the pressable itself.
  const press = usePressScale();

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        // Soft tap on press-down. Platform gating and failure live in the
        // wrapper, not here.
        haptics.press();
        press.onPressIn();
        props.onPressIn?.(ev);
      }}
      onPressOut={(ev) => {
        press.onPressOut();
        props.onPressOut?.(ev);
      }}
    >
      <Animated.View style={[styles.content, press.style]}>
        {children}
      </Animated.View>
    </PlatformPressable>
  );
}
