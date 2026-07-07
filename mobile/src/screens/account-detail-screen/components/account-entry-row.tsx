import { StyleSheet, Text, View } from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatSignedMoney, groupThousands } from "@/common/number-utils";
import { AccountJournalRow } from "@/screens/account-detail-screen/selectors/select-account-journal";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
    },
    left: {
      flex: 1,
      marginRight: 12,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    title: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.text01,
      flexShrink: 1,
    },
    badge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: theme.warning,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.white,
    },
    date: {
      marginTop: 2,
      fontSize: 12,
      color: theme.black60,
    },
    right: {
      alignItems: "flex-end",
    },
    change: {
      fontSize: 15,
      fontWeight: "600",
    },
    balance: {
      marginTop: 2,
      fontSize: 12,
      color: theme.black60,
    },
  });

type AccountEntryRowProps = {
  row: AccountJournalRow;
  currencySymbol: string;
};

/**
 * One account-journal row: the entry's description and date on the left, the
 * signed change (green/red) and the running balance after it on the right.
 */
export function AccountEntryRow({
  row,
  currencySymbol,
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

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {row.title || t("transactions")}
          </Text>
          {isPending && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>P</Text>
            </View>
          )}
        </View>
        {Boolean(row.date) && <Text style={styles.date}>{row.date}</Text>}
      </View>
      <View style={styles.right}>
        <Text style={[styles.change, { color: changeColor }]}>
          {formatSignedMoney(row.change, currencySymbol, true)}
        </Text>
        <Text style={styles.balance}>
          {t("balance")}: {currencySymbol}
          {groupThousands(row.balance)}
        </Text>
      </View>
    </View>
  );
}
