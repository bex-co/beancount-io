import React from "react";
import { StyleSheet, Text, TouchableHighlight } from "react-native";
import RNDateTimePickerModal, {
  CustomCancelButtonPropTypes,
  ReactNativeModalDateTimePickerProps,
} from "react-native-modal-datetime-picker";
import { useTheme } from "@/common/theme";

/**
 * The library renders the cancel button as its own separate card and paints it
 * with a hard-coded near-black background (#0E0E0E) in dark mode. On our
 * Charcoal page that card is indistinguishable from the backdrop, so it "blends
 * in". Repaint it with the elevated-surface token so it reads as a raised card,
 * matching the picker card above it. Layout metrics mirror the library defaults
 * so nothing shifts.
 */
const ThemedCancelButton: React.FC<CustomCancelButtonPropTypes> = ({
  onPress,
  label,
}) => {
  const { colorTheme } = useTheme();
  return (
    <TouchableHighlight
      style={[styles.cancelButton, { backgroundColor: colorTheme.black10 }]}
      underlayColor={colorTheme.black20}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.cancelLabel, { color: colorTheme.primary }]}>
        {label}
      </Text>
    </TouchableHighlight>
  );
};

/**
 * App-wide date picker.
 *
 * Wraps `react-native-modal-datetime-picker` so every caller gets a consistent,
 * on-theme picker:
 * - `locale="en_US"` pins the spinner columns to Month → Day → Year. Without a
 *   locale the native iOS picker follows the device region and can flip to
 *   Day → Month → Year. (Stored dates are ISO `YYYY-MM-DD`, so this is purely
 *   the wheel column order.)
 * - Dark mode is driven by our own theme (`themeVar`) rather than the OS
 *   appearance, so the picker never mismatches an in-app theme override.
 * - The picker card and cancel button use the elevated-surface token, so the
 *   modal stands clear of the near-black page instead of merging into it.
 *
 * Accepts every prop of the underlying modal; explicit props win over the
 * defaults above.
 */
export const DatePickerModal: React.FC<ReactNativeModalDateTimePickerProps> = (
  props,
) => {
  const { colorTheme, name } = useTheme();
  return (
    <RNDateTimePickerModal
      locale="en_US"
      isDarkModeEnabled={name === "dark"}
      buttonTextColorIOS={colorTheme.primary}
      pickerContainerStyleIOS={{ backgroundColor: colorTheme.black10 }}
      customCancelButtonIOS={ThemedCancelButton}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  cancelButton: {
    borderRadius: 13,
    height: 57,
    justifyContent: "center",
  },
  cancelLabel: {
    padding: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
});
