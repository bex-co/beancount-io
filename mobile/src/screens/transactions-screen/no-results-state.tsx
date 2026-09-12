import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStyle, useTheme } from "@/common/hooks";
import { fontSizes, fontWeights } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";
import { useKeyboardHeight } from "@/components/keyboard-accessory-bar/use-keyboard-height";
import { getKeyboardOverlap } from "@/components/keyboard-accessory-bar/utils";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.black10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    message: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      textAlign: "center",
      lineHeight: 24,
    },
  });

/**
 * Shown when the ledger has transactions but the search matched none of them.
 */
export const NoResultsState = () => {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  // This state only ever shows while the user is typing in the search field, so
  // the keyboard is usually up: centering in the full-height container puts the
  // message behind it. Shortening the container by the overlap centers it in the
  // visible region instead.
  const keyboardOverlap = getKeyboardOverlap(keyboardHeight, insets.bottom);

  return (
    <View
      style={[
        styles.container,
        keyboardOverlap > 0 && { marginBottom: keyboardOverlap },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="search-outline" size={40} color={theme.black60} />
      </View>
      <Text style={styles.message}>{t("transactionsNoSearchResults")}</Text>
    </View>
  );
};
