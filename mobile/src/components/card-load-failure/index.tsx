import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/common/theme";
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
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
    retry: {
      fontSize: fontSizes.md,
      color: theme.primary,
      textAlign: LEADING_TEXT_ALIGN,
    },
    retryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  });

/**
 * The least time "Try again" shows its busy state: a retry that fails at once,
 * or a refetch whose new error equals the one on screen (which Apollo does not
 * render), otherwise looked like a tap that did nothing (w21/936).
 */
const MIN_BUSY_MS = 600;

/**
 * What a card shows when its first load failed: that it could not load, and a
 * way to try again. Never the empty state, which would tell the user something
 * about their ledger that the failed request does not know.
 */
export function CardLoadFailure({
  onRetry,
}: {
  /** May return the retry's promise: the busy state then lasts until it settles. */
  onRetry?: () => unknown;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const retry = async () => {
    if (busy || !onRetry) return;
    setBusy(true);
    try {
      await Promise.all([
        Promise.resolve()
          .then(onRetry)
          .catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, MIN_BUSY_MS)),
      ]);
    } finally {
      if (mounted.current) {
        setBusy(false);
        // Still here: the retry failed again, and an identical error renders
        // nothing new for a screen reader to notice.
        AccessibilityInfo.announceForAccessibility(t("ledgerLoadError"));
      }
    }
  };
  return (
    <View style={styles.row} testID="card-load-failure">
      <Text style={styles.message}>{t("ledgerLoadError")}</Text>
      {onRetry ? (
        <Pressable
          onPress={() => void retry()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          hitSlop={8}
        >
          <View style={styles.retryRow}>
            <Text style={styles.retry}>{t("discoveryRetry")}</Text>
            {busy ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : null}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
