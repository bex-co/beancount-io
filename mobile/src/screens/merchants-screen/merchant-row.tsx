import { StyleSheet, Text, View } from "react-native";
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
import type { MerchantAggregate } from "./selectors/aggregate-payees";

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
    name: {
      fontSize: fontSizes.lg,
      lineHeight: 22,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: LEADING_TEXT_ALIGN,
    },
    count: {
      marginTop: 2,
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black60,
      textAlign: LEADING_TEXT_ALIGN,
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
  merchant: MerchantAggregate;
}

/**
 * One directory row: brand logo (or glyph fallback), payee name, transaction
 * count subtitle, trailing last-transaction date. Navigation lands in m36.
 */
export function MerchantRow({ merchant }: MerchantRowProps) {
  const styles = useThemeStyle(getStyles);
  const { t, locale } = useTranslations();
  const countLabel = t("merchantsTransactionCount", {
    count: merchant.transactionCount,
  });
  const lastDate = merchant.lastDate
    ? formatLedgerDateShort(merchant.lastDate, locale)
    : "";

  return (
    <View style={styles.row} testID="merchant-row">
      {/* Empty postings → root fallback glyph when the brand matcher misses;
          curated brands still resolve via `payee`. */}
      <AccountTypeIcon postings={[]} payee={merchant.payee} />
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {merchant.payee}
        </Text>
        <Text style={styles.count} numberOfLines={1}>
          {countLabel}
        </Text>
      </View>
      {lastDate ? (
        <Text style={styles.date} numberOfLines={1}>
          {lastDate}
        </Text>
      ) : null}
    </View>
  );
}
