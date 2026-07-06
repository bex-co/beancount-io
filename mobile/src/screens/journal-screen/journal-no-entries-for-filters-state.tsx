import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStyle, useTheme } from "@/common/hooks";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";

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
      fontSize: 16,
      fontWeight: "500",
      color: theme.black80,
      textAlign: "center",
      lineHeight: 24,
    },
  });

/**
 * Component for rendering the state when the journal has entries,
 * but none match the current filters.
 */
export const JournalNoEntriesForFiltersState = () => {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="filter-outline" size={40} color={theme.black60} />
      </View>
      <Text style={styles.message}>{t("journalNoEntriesForFilters")}</Text>
    </View>
  );
};
