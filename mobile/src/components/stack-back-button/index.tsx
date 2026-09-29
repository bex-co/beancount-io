import { router } from "expo-router";
import { ColorValue, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { directionalIcon } from "@/common/rtl";

// Hook-free so it can be used as a headerLeft render function without causing
// hook-count mismatches when screens override headerLeft with their own function.
// The tintColor comes from the Stack's headerTintColor screenOption; `label` is
// the spoken name, resolved by the layout because this renderer cannot call
// useTranslations without breaking the hook-free contract above.
export const StackBackButton = ({
  tintColor,
  label,
  onPress,
}: {
  tintColor?: ColorValue;
  label?: string;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress ?? router.back}
    style={{ paddingHorizontal: 8, paddingVertical: 4 }}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons
      name={directionalIcon("chevron-back")}
      size={28}
      color={tintColor}
      // The glyph has no text of its own, but leaving it visible to assistive
      // tech lets the icon font's name leak in beside the label.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  </Pressable>
);
