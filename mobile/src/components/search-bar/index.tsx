import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontSizes, space, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { ColorTheme } from "@/types/theme-props";
import {
  SEARCH_BAR_RADIUS,
  SEARCH_FIELD_PADDING_VERTICAL,
  searchFieldHeight,
} from "./metrics";

/**
 * The field's outer box, re-exported so a loading skeleton or a neighbouring
 * control can mirror it exactly rather than restating the numbers — three
 * screens do, and a copied `36` would silently break the row's alignment the
 * moment the field's height changes. `searchFieldHeight` is the height at a
 * given Dynamic Type scale; the raw `SEARCH_BAR_HEIGHT` constant stays in
 * `./metrics` so nothing can pin a box to the default text size by accident.
 */
export { SEARCH_BAR_RADIUS, searchFieldHeight } from "./metrics";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    // The control triple, not the raw ramp: on the light surface a `black10`
    // fill alone is 1.10:1 and the field reads as a smudge. See `palette.ts`.
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      paddingHorizontal: space.md,
      // Height comes from the caller-independent `searchFieldHeight` as a
      // *minimum*: at the default text size the 16pt input plus this padding is
      // far under 36, so the box is still exactly 36 tall, while enlarged typed
      // text grows the field instead of being clipped by it.
      paddingVertical: SEARCH_FIELD_PADDING_VERTICAL,
      borderRadius: SEARCH_BAR_RADIUS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      backgroundColor: theme.controlFill,
    },
    input: {
      flex: 1,
      fontSize: fontSizes.lg,
      color: theme.black90,
    },
    // RN gives a bare TextInput its own vertical padding on Android, which
    // pushes the text off-centre inside the field. Scoped to Android: on iOS
    // zeroing the padding also clamps the line box, which clips descenders of
    // enlarged text.
    inputAndroid: {
      padding: 0,
    },
  });

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /**
   * Trailing control rendered inside the field — the transactions list passes
   * its filter button here. Without it that screen would need its own copy of
   * the whole field just to hang one icon off the end.
   */
  right?: ReactNode;
  /**
   * Outer spacing. Deliberately the caller's: the two screens sit the field in
   * different layouts (a standalone band vs. a list header), and baking one
   * screen's margins into the shared component is how the previous copies
   * drifted in the first place.
   */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Forwarded to the inner `TextInput` so automation can focus the field. */
  testID?: string;
}

/**
 * The app's one search input.
 *
 * Extracted from three near-identical copies (account picker, transactions,
 * and a journal header since deleted) that had already drifted apart in
 * padding and icon spacing. Everything inside the field — metrics, the leading
 * icon, the keyboard and autocorrect behaviour — is fixed here so a fourth
 * screen gets a search field instead of a fourth variant.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  right,
  style,
  accessibilityLabel,
  testID,
}: SearchBarProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { fontScale } = useWindowDimensions();

  return (
    <View
      style={[styles.field, { minHeight: searchFieldHeight(fontScale) }, style]}
    >
      <Ionicons
        name="search-outline"
        size={16}
        color={theme.controlPlaceholder}
      />
      <TextInput
        testID={testID}
        style={[styles.input, Platform.OS === "android" && styles.inputAndroid]}
        placeholder={placeholder}
        placeholderTextColor={theme.controlPlaceholder}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={accessibilityLabel ?? placeholder}
      />
      {right}
    </View>
  );
}
