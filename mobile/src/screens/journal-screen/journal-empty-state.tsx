import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStyle, useTheme } from "@/common/hooks";
import { fontSizes, fontWeights } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    emptyContainer: {
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
      backgroundColor: theme.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: "center",
      marginBottom: 8,
    },
    message: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.regular,
      color: theme.black60,
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 24,
    },
    instructionsContainer: {
      width: "100%",
      alignItems: "flex-start",
    },
    instructionsTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      marginBottom: 16,
    },
    instructionItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
      paddingLeft: 4,
    },
    bullet: {
      fontSize: fontSizes.lg,
      color: theme.primary,
      marginRight: 12,
      marginTop: 2,
    },
    instructionText: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.regular,
      color: theme.black80,
      lineHeight: 22,
    },
    finalMessage: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.regular,
      color: theme.black60,
      textAlign: "center",
      marginTop: 24,
      lineHeight: 20,
      fontStyle: "italic",
    },
  });

/**
 * Component for rendering the empty state when there are no journal entries
 */
export const JournalEmptyState = () => {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="journal-outline" size={40} color={theme.primary} />
      </View>

      <Text style={styles.title}>{t("journalWelcomeTitle")}</Text>

      <Text style={styles.message}>{t("journalWelcomeMessage")}</Text>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>
          {t("journalWelcomeInstructions")}
        </Text>

        <View style={styles.instructionItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.instructionText}>
            {t("journalWelcomeInstruction1")}
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.instructionText}>
            {t("journalWelcomeInstruction2")}
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.instructionText}>
            {t("journalWelcomeInstruction3")}
          </Text>
        </View>
      </View>

      <Text style={styles.finalMessage}>
        {t("journalWelcomeInstructionFinal")}
      </Text>
    </View>
  );
};
