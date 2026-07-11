import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { ColorTheme } from "@/types/theme-props";
import {
  JournalDirectiveType,
  isJournalTransaction,
  isJournalOpen,
  isJournalClose,
} from "../types";
import { getAvatarInitials, getAvatarColor } from "../utils/journal-utils";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      // No background: rows inherit their container's color so they sit on the
      // DashboardCard (theme.black10) in the home/reports cards and on the
      // screen (theme.white) in the full journal list. Hardcoding theme.white
      // made rows punch a page-colored hole through the cards in both themes.
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      flexShrink: 0,
    },
    avatarText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: "#fff",
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

const formatAmount = (value: number, currency: string): string => {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "USD" ? `$${formatted}` : `${formatted} ${currency}`;
};

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

  const { postings } = entry;
  if (!postings?.length) {
    return { name, amountStr: "", isPositive: null };
  }

  // Use asset/liability postings to determine cash flow direction
  const cashPostings = postings.filter(
    (p) =>
      p.account.startsWith("Assets:") || p.account.startsWith("Liabilities:"),
  );

  if (cashPostings.length > 0) {
    const net = cashPostings.reduce(
      (sum, p) => sum + parseFloat(p.units.number),
      0,
    );
    const currency = cashPostings[0].units.currency;
    return {
      name,
      amountStr: formatAmount(net, currency),
      isPositive: net > 0,
    };
  }

  // Fallback: largest absolute posting
  let max = postings[0];
  for (const p of postings) {
    if (
      Math.abs(parseFloat(p.units.number)) >
      Math.abs(parseFloat(max.units.number))
    ) {
      max = p;
    }
  }
  const num = parseFloat(max.units.number);
  return {
    name,
    amountStr: formatAmount(num, max.units.currency),
    isPositive: num > 0,
  };
};

interface JournalEntryItemProps {
  entry: JournalDirectiveType;
  onPress?: () => void;
}

export const JournalEntryItem: React.FC<JournalEntryItemProps> = ({
  entry,
  onPress,
}) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  const { name, amountStr, isPositive } = getDisplayInfo(entry);
  const isPending = isJournalTransaction(entry) && entry.flag === "!";
  const avatarColor = getAvatarColor(name);
  const initials = getAvatarInitials(name);

  const content = (
    <>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

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
