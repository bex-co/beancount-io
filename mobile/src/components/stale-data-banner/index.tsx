import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslations } from "@/common/hooks/use-translations";
import { gutter, useTheme } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: gutter,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.black10,
      borderStartWidth: 3,
      borderStartColor: theme.warning,
    },
    text: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: theme.black80,
    },
  });

/**
 * Quiet screen-level notice that numbers on screen may be stale because a
 * background refetch failed (offline or server error). Not a replacement for
 * first-load error UI — only mount when `isShowingStaleData` is true.
 */
export function StaleDataBanner(): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);

  return (
    <View
      style={styles.banner}
      accessibilityRole="text"
      accessibilityLabel={t("staleDataNotice")}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={theme.warning} />
      <Text style={styles.text}>{t("staleDataNotice")}</Text>
    </View>
  );
}
