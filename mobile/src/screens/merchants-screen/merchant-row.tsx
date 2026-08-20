import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import {
  fontSizes,
  fontWeights,
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  space,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatLedgerDateShort } from "@/common/date-format";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { ColorTheme } from "@/types/theme-props";
import { formatAmount } from "@/screens/transactions-screen/utils/transaction-display-utils";
import {
  cadenceLabelKey,
  type MerchantListItem,
} from "./selectors/merchant-sections";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
    },
    middle: {
      flex: 1,
      marginEnd: space.sm,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.xs,
    },
    name: {
      flexShrink: 1,
      fontSize: fontSizes.lg,
      lineHeight: 22,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: LEADING_TEXT_ALIGN,
    },
    badge: {
      flexShrink: 0,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      backgroundColor: theme.black10,
    },
    badgeText: {
      fontSize: fontSizes.xs,
      lineHeight: 14,
      fontWeight: fontWeights.medium,
      color: theme.black60,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    subtitle: {
      marginTop: 2,
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black60,
      textAlign: LEADING_TEXT_ALIGN,
    },
    trailing: {
      alignItems: "flex-end",
      flexShrink: 0,
      maxWidth: "42%",
    },
    amount: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      fontVariant: ["tabular-nums"],
      textAlign: "right",
    },
    meta: {
      marginTop: 2,
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black60,
      fontVariant: ["tabular-nums"],
      textAlign: "right",
    },
    overdueMeta: {
      color: theme.error,
      fontWeight: fontWeights.medium,
    },
    date: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black60,
      fontVariant: ["tabular-nums"],
      flexShrink: 0,
    },
  });

interface MerchantRowProps {
  item: MerchantListItem;
  onPress: () => void;
}

function primaryTypical(
  amounts: Record<string, number>,
): { currency: string; amount: number } | null {
  const entries = Object.entries(amounts);
  if (entries.length === 0) {
    return null;
  }
  entries.sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!));
  const [currency, amount] = entries[0]!;
  return { currency, amount };
}

/**
 * Directory row: brand logo, payee, count (or recurring cadence/amount/next),
 * optional RECURRING badge on general-list rows, overdue tint on the next date.
 */
export function MerchantRow({ item, onPress }: MerchantRowProps) {
  const styles = useThemeStyle(getStyles);
  const { t, locale } = useTranslations();
  const { merchant, resolved, inRecurringSection } = item;
  const showBadge = resolved.isRecurring && !inRecurringSection;
  const detection = resolved.detection;

  const countLabel = t("merchantsTransactionCount", {
    count: merchant.transactionCount,
  });
  const lastDate = merchant.lastDate
    ? formatLedgerDateShort(merchant.lastDate, locale)
    : "";

  let subtitle = countLabel;
  let trailingAmount: string | null = null;
  let trailingMeta: string | null = lastDate || null;
  let trailingOverdue = false;

  if (inRecurringSection && resolved.isRecurring) {
    const cadenceKey = cadenceLabelKey(resolved.cadence);
    const cadenceLabel = cadenceKey ? t(cadenceKey) : "";
    const typical = detection
      ? primaryTypical(detection.typicalAmountByCurrency)
      : null;
    const amountText = typical
      ? `${detection?.isApproximate ? "~" : ""}${formatAmount(typical.amount, typical.currency)}`
      : null;
    subtitle = cadenceLabel;
    trailingAmount = amountText;
    if (detection?.nextExpected) {
      const next = formatLedgerDateShort(detection.nextExpected, locale);
      if (detection.isOverdue) {
        trailingMeta = t("merchantsOverdue");
        trailingOverdue = true;
      } else {
        trailingMeta = t("merchantsNextExpected", { date: next });
      }
    } else {
      trailingMeta = null;
    }
  }

  return (
    <TouchableOpacity
      style={styles.row}
      testID="merchant-row"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={merchant.payee}
    >
      <AccountTypeIcon postings={[]} payee={merchant.payee} />
      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {merchant.payee}
          </Text>
          {showBadge ? (
            <View style={styles.badge} testID="merchant-recurring-badge">
              <Text style={styles.badgeText}>
                {t("merchantsRecurringBadge")}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {inRecurringSection ? (
        <View style={styles.trailing}>
          {trailingAmount ? (
            <Text style={styles.amount} numberOfLines={1}>
              {trailingAmount}
            </Text>
          ) : null}
          {trailingMeta ? (
            <Text
              style={[styles.meta, trailingOverdue && styles.overdueMeta]}
              numberOfLines={1}
            >
              {trailingMeta}
            </Text>
          ) : null}
        </View>
      ) : lastDate ? (
        <Text style={styles.date} numberOfLines={1}>
          {lastDate}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
