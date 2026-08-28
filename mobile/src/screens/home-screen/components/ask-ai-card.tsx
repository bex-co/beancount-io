import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ColorTheme } from "@/types/theme-props";
import { fontSizes, space, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      marginHorizontal: space.lg,
      marginBottom: space.md,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      borderRadius: 24,
      backgroundColor: theme.controlFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
    },
    placeholder: {
      flex: 1,
      fontSize: fontSizes.lg,
      color: theme.controlPlaceholder,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

/**
 * The front door to the assistant.
 *
 * Shaped like an input rather than a button on purpose: an empty field that
 * says what it takes teaches the feature in the space a button would only name
 * it. It does not accept typing here — tapping opens the chat, where the
 * question chips are — so there is one input to focus and one place a
 * conversation lives.
 */
export function AskAiCard() {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t("agentAskCard")}
      testID="home-ask-ai-card"
      onPress={() => {
        router.navigate({ pathname: "/agent" });
      }}
    >
      <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {t("agentAskCard")}
      </Text>
    </TouchableOpacity>
  );
}
