import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  formatMoneyWithCurrency,
  formatSignedMoneyWithCurrency,
} from "@/common/number-utils";
import { AccountJournalRow } from "@/screens/account-detail-screen/selectors/select-account-journal";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
    },
    middle: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      flexShrink: 1,
      textAlign: LEADING_TEXT_ALIGN,
    },
    badge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: theme.warning,
    },
    badgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: "#fff",
    },
    trailing: {
      alignItems: "flex-end",
    },
    change: {
      fontSize: fontSizes.md,
    },
    balance: {
      marginTop: 2,
      fontSize: fontSizes.xs,
      color: theme.black60,
    },
  });

type AccountEntryRowProps = {
  row: AccountJournalRow;
  currency: string;
  onPress?: () => void;
};

export function AccountEntryRow({
  row,
  currency,
  onPress,
}: AccountEntryRowProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  const isPending = row.flag === "!";
  const changeColor =
    row.change > 0
      ? theme.success
      : row.change < 0
        ? theme.error
        : theme.black60;

  const content = (
    <>
      <AccountTypeIcon postings={row.postings} payee={row.payee} />

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {row.title || t("transactions")}
        </Text>
        {isPending && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>P</Text>
          </View>
        )}
      </View>

      <View style={styles.trailing}>
        <AmountText
          mono="medium"
          style={[styles.change, { color: changeColor }]}
        >
          {formatSignedMoneyWithCurrency(row.change, currency, true)}
        </AmountText>
        <AmountText style={styles.balance}>
          {t("balance")}: {formatMoneyWithCurrency(row.balance, currency)}
        </AmountText>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{content}</View>;
}
