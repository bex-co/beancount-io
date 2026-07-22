import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { ColorTheme } from "@/types/theme-props";
import {
  JournalDirectiveType,
  isJournalTransaction,
  isJournalOpen,
  isJournalClose,
} from "../types";
import { getEntryAccounts } from "../utils/entry-utils";
import { selectTransactionAmount } from "../utils/transaction-display-utils";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      // No background: rows inherit their container's color so they sit on the
      // DashboardCard (theme.black10) in the home/reports cards and on the
      // screen (theme.white) in the transactions and journal lists. Hardcoding theme.white
      // made rows punch a page-colored hole through the cards in both themes.
    },
    middle: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    name: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      flexShrink: 1,
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
    typeLabel: {
      fontSize: fontSizes.xs,
      color: theme.black60,
      flexShrink: 1,
    },
    amount: {
      fontSize: fontSizes.md,
      marginLeft: 8,
      flexShrink: 0,
    },
    amountPositive: {
      color: theme.success,
    },
    amountNeutral: {
      color: theme.black90,
    },
  });

const getDisplayInfo = (
  entry: JournalDirectiveType,
): { name: string; amountStr: string; isPositive: boolean | null } => {
  if (isJournalOpen(entry)) {
    const currencies = entry.currencies?.join(", ") ?? "";
    return { name: entry.account, amountStr: currencies, isPositive: null };
  }

  if (isJournalClose(entry)) {
    return { name: entry.account, amountStr: "", isPositive: null };
  }

  if (!isJournalTransaction(entry)) {
    return {
      name: entry.directive_type,
      amountStr: "",
      isPositive: null,
    };
  }

  const name = entry.payee || entry.narration || entry.directive_type;

  const amount = selectTransactionAmount(entry);
  if (!amount) {
    return { name, amountStr: "", isPositive: null };
  }

  return { name, amountStr: amount.text, isPositive: amount.value > 0 };
};

interface EntryRowProps {
  entry: JournalDirectiveType;
  onPress?: () => void;
}

export const EntryRow: React.FC<EntryRowProps> = ({ entry, onPress }) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  const { name, amountStr, isPositive } = getDisplayInfo(entry);
  const isPending = isJournalTransaction(entry) && entry.flag === "!";

  const content = (
    <>
      <AccountTypeIcon accounts={getEntryAccounts(entry)} />

      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {isPending && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>P</Text>
          </View>
        )}
      </View>

      {amountStr ? (
        <AmountText
          mono="medium"
          style={[
            styles.amount,
            isPositive ? styles.amountPositive : styles.amountNeutral,
          ]}
        >
          {isPositive ? `+${amountStr}` : amountStr}
        </AmountText>
      ) : (
        <AmountText
          mono="medium"
          style={[styles.amount, { color: theme.black60 }]}
        >
          {entry.directive_type}
        </AmountText>
      )}
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
};
