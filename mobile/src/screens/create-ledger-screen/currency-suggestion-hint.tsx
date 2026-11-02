import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { fontSizes, space } from "@/common/theme";
import type { ColorTheme } from "@/types/theme-props";
import type { CurrencySuggestion } from "./currency-suggestion";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: space.sm,
      marginTop: space.xs,
    },
    source: {
      color: theme.black80,
      fontSize: fontSizes.sm,
      textAlign: LEADING_TEXT_ALIGN,
    },
    candidate: {
      borderColor: theme.black60,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
    },
    candidateText: {
      color: theme.primary,
      fontSize: fontSizes.sm,
    },
  });

const SOURCE_KEY = {
  saved: "createLedgerCurrencyFromSaved",
  native: "createLedgerCurrencyFromDevice",
  region: "createLedgerCurrencyFromRegion",
} as const;

/**
 * Where the preselected currency came from, and the time zone's currency as
 * a one-tap alternative when it differs (ADR026). The label shows only while
 * the suggestion is still the value; the fallback USD carries none.
 */
export function CurrencySuggestionHint({
  suggestion,
  value,
  chosen,
  onPick,
}: {
  suggestion: CurrencySuggestion;
  value: string;
  chosen: boolean;
  onPick: (currency: string) => void;
}): JSX.Element | null {
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const current = value.trim().toUpperCase();
  const label =
    !chosen &&
    current === suggestion.currency &&
    suggestion.source !== "fallback"
      ? t(SOURCE_KEY[suggestion.source])
      : null;
  const candidate =
    suggestion.timeZoneCandidate && current !== suggestion.timeZoneCandidate
      ? suggestion.timeZoneCandidate
      : null;
  if (!label && !candidate) return null;
  return (
    <View style={styles.row}>
      {label ? (
        <Text style={styles.source} testID="create-ledger-currency-source">
          {label}
        </Text>
      ) : null}
      {candidate ? (
        <Pressable
          onPress={() => onPick(candidate)}
          accessibilityRole="button"
          style={styles.candidate}
          testID="create-ledger-currency-candidate"
        >
          <Text style={styles.candidateText}>
            {t("createLedgerCurrencyUseTimeZone", { currency: candidate })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
