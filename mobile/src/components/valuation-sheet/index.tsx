import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatLedgerDateShort } from "@/common/date-format";
import { formatHolding, type Holding } from "@/common/balance-display";
import { stalePrices, type Valuation } from "@/common/valuation";
import { buildLedgerUrl } from "@/common/app-links/build-ledger-url";
import { getServerUrl } from "@/common/vars/server-url";
import { Button } from "@/components/button";
import { ColorTheme } from "@/types/theme-props";
import { useGuest } from "@/common/guest/guest-context";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.white,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: "80%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black40,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: theme.text01,
    },
    close: {
      fontSize: 16,
      color: theme.primary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
      gap: 12,
    },
    holding: {
      flex: 1,
      fontSize: 16,
      color: theme.text01,
    },
    detail: {
      flexShrink: 1,
      alignItems: "flex-end",
    },
    date: {
      fontSize: 14,
      color: theme.black80,
      textAlign: "right",
    },
    stale: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    staleText: {
      fontSize: 14,
      color: theme.warning,
    },
    footer: {
      padding: 16,
    },
  });

type Entry = {
  holding: Holding;
  /** What the row says about the holding's price. */
  detail: string;
  stale: boolean;
};

/**
 * The detail behind a valued total's status line (w4/m27 rule 2): every held
 * commodity with its latest price date — stale ones first and marked — then
 * those still at cost and those left out of the total, and one way to fix
 * them, the ledger's Commodities page on the web.
 */
export function ValuationSheet({
  valuation,
  ledgerId,
  onClose,
}: {
  /** The holdings to show; null while the sheet is closed. */
  valuation: Valuation | null;
  ledgerId: string;
  onClose: () => void;
}): JSX.Element | null {
  const { t, locale } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const insets = useSafeAreaInsets();
  const guest = useGuest();
  if (valuation === null) return null;

  const stale = stalePrices(valuation);
  const fresh = valuation.priced
    .filter((holding) => !holding.stale)
    .sort((a, b) => a.currency.localeCompare(b.currency));
  const entries: Entry[] = [
    ...[...stale, ...fresh].map((holding) => ({
      holding,
      detail: holding.managed
        ? `${t("valuationLivePrice")} · ${formatLedgerDateShort(holding.priceDate, locale)}`
        : t("valuationPriceDate", {
            date: formatLedgerDateShort(holding.priceDate, locale),
          }),
      stale: holding.stale,
    })),
    ...valuation.atCostNoPrice.map((holding) => ({
      holding,
      detail: `${t("valuationNoPrice")} · ${t("valuationAtCostTag")}`,
      stale: false,
    })),
    ...valuation.notInTotal.map((holding) => ({
      holding,
      detail: t("valuationNotInTotalTag"),
      stale: false,
    })),
  ];

  const openCommodities = () => {
    void WebBrowser.openBrowserAsync(
      buildLedgerUrl(
        { kind: "commodities", ledgerFullName: ledgerId },
        getServerUrl(),
      ),
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {/* The backdrop is a touch target only. As an accessible element it
          grouped the whole sheet into one full-screen "Done", hiding the
          heading, holdings and footer; the header's Done and the escape
          gesture close the sheet for assistive tech. */}
      <Pressable style={styles.overlay} onPress={onClose} accessible={false}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          // Swallows taps so only the backdrop closes the sheet.
          onPress={() => undefined}
          accessible={false}
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {t("valuationDetailsTitle")}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("done")}
            >
              <Text style={styles.close}>{t("done")}</Text>
            </Pressable>
          </View>
          <ScrollView>
            {entries.map(({ holding, detail, stale: behind }) => (
              <View
                key={`${holding.currency}-${detail}`}
                style={styles.row}
                accessible
                accessibilityLabel={[
                  formatHolding(holding),
                  detail,
                  behind ? t("valuationNotUpdated") : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              >
                <Text style={styles.holding}>{formatHolding(holding)}</Text>
                <View style={styles.detail}>
                  <Text style={styles.date}>{detail}</Text>
                  {behind && (
                    <View style={styles.stale}>
                      <Ionicons
                        name="warning-outline"
                        size={14}
                        color={theme.warning}
                      />
                      <Text style={styles.staleText}>
                        {t("valuationNotUpdated")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Button
              type="outline"
              onPress={
                guest
                  ? () => {
                      onClose();
                      guest.requestSignIn();
                    }
                  : openCommodities
              }
            >
              {t(guest ? "signIn" : "updatePricesOnWeb")}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
