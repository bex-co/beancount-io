import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { fontSizes, gutter } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: gutter,
      paddingVertical: 12,
      gap: 6,
    },
    message: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: LEADING_TEXT_ALIGN,
    },
    retry: {
      fontSize: fontSizes.md,
      color: theme.primary,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

/**
 * What a card shows when its first load failed: that it could not load, and a
 * way to try again. Never the empty state, which would tell the user something
 * about their ledger that the failed request does not know.
 */
export function CardLoadFailure({
  onRetry,
}: {
  onRetry?: () => void;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  return (
    <View style={styles.row} testID="card-load-failure">
      <Text style={styles.message}>{t("ledgerLoadError")}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.retry}>{t("discoveryRetry")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
