import React from "react";
import { StyleSheet, Text, TouchableHighlight } from "react-native";
import RNDateTimePickerModal, {
  CustomCancelButtonPropTypes,
  CustomConfirmButtonPropTypes,
  ReactNativeModalDateTimePickerProps,
} from "react-native-modal-datetime-picker";
import { useReactiveVar } from "@apollo/client";
import { useTheme } from "@/common/theme";
import { localeVar } from "@/common/vars";
import { useTranslations } from "@/common/hooks/use-translations";

/** Shared action-card sizing: grows with Dynamic Type instead of clipping labels. */
const actionButtonStyles = StyleSheet.create({
  button: {
    borderRadius: 13,
    minHeight: 57,
    justifyContent: "center",
    paddingVertical: 10,
  },
  label: {
    paddingHorizontal: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
});

/**
 * The library renders the cancel button as its own separate card and paints it
 * with a hard-coded near-black background (#0E0E0E) in dark mode. On our
 * Charcoal page that card is indistinguishable from the backdrop, so it "blends
 * in". Repaint it with the elevated-surface token so it reads as a raised card,
 * matching the picker card above it. Layout metrics mirror the library defaults
 * so nothing shifts at the default text size.
 */
const ThemedCancelButton: React.FC<CustomCancelButtonPropTypes> = ({
  onPress,
  label,
}) => {
  const { colorTheme } = useTheme();
  return (
    <TouchableHighlight
      style={[
        actionButtonStyles.button,
        { backgroundColor: colorTheme.controlFill },
      ]}
      underlayColor={colorTheme.controlSelected}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[actionButtonStyles.label, { color: colorTheme.primary }]}>
        {label}
      </Text>
    </TouchableHighlight>
  );
};

/** Confirm uses the same adaptive card as cancel — the library default is height 57. */
const ThemedConfirmButton: React.FC<CustomConfirmButtonPropTypes> = ({
  onPress,
  label,
}) => {
  const { colorTheme } = useTheme();
  return (
    <TouchableHighlight
      style={[
        actionButtonStyles.button,
        {
          backgroundColor: colorTheme.controlFill,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colorTheme.controlBorder,
        },
      ]}
      underlayColor={colorTheme.controlSelected}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[actionButtonStyles.label, { color: colorTheme.primary }]}>
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
 * - `locale` is the app's own language, so the month names match the translated
 *   screen around the picker. `UIDatePicker` takes month names and column order
 *   from the same locale, so the order follows the language too (Day → Month →
 *   Year in German); pinning one pins the other. Stored dates are ISO
 *   `YYYY-MM-DD` either way.
 * - The confirm and cancel labels are the app's translated strings; the
 *   library's own defaults are English.
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
  const locale = useReactiveVar(localeVar);
  const { t } = useTranslations();
  return (
    <RNDateTimePickerModal
      locale={locale || undefined}
      confirmTextIOS={t("confirm")}
      cancelTextIOS={t("cancel")}
      isDarkModeEnabled={name === "dark"}
      buttonTextColorIOS={colorTheme.primary}
      pickerContainerStyleIOS={{ backgroundColor: colorTheme.controlFill }}
      customCancelButtonIOS={ThemedCancelButton}
      customConfirmButtonIOS={ThemedConfirmButton}
      {...props}
    />
  );
};
