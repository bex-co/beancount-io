import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useThemeStyle } from "@/common/hooks";
import {
  fontSizes,
  fontWeights,
  gutter,
  prefersStackedLayout,
  rowMinHeight,
  rowPaddingVertical,
  space,
  useTheme,
} from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { ColorTheme } from "@/types/theme-props";
import {
  JournalDirectiveType,
  isJournalTransaction,
  isJournalOpen,
  isJournalClose,
} from "../types";
import { getEntryPostings } from "../utils/entry-utils";
import { selectTransactionAmount } from "../utils/transaction-display-utils";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { formatEntryRowAmount } from "./format-entry-row-amount";
import { entryRowSecondaryText } from "./entry-row-secondary";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
      // No background: rows inherit their container's color so they sit on the
      // DashboardCard (theme.black10) in the home/reports cards and on the
      // screen (theme.white) in the transactions and journal lists. Hardcoding theme.white
      // made rows punch a page-colored hole through the cards in both themes.
    },
    // Accessibility text sizes (see `prefersStackedLayout`): the amount moves
    // under the icon and name instead of taking the width the name needs, so a
    // payee beside a 19-character amount is no longer cut to "Q2…".
    rowStacked: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    stackedMain: {
      flexDirection: "row",
      alignItems: "center",
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
      textAlign: LEADING_TEXT_ALIGN,
    },
    nameColumn: {
      flexShrink: 1,
    },
    secondary: {
      fontSize: fontSizes.sm,
      color: theme.black60,
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
    typeLabel: {
      fontSize: fontSizes.xs,
      color: theme.black60,
      flexShrink: 1,
    },
    amount: {
      fontSize: fontSizes.md,
      marginStart: space.sm,
      flexShrink: 0,
    },
    amountStacked: {
      marginStart: 0,
      marginTop: 2,
      alignSelf: "flex-start",
      textAlign: LEADING_TEXT_ALIGN,
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

  return {
    name,
    amountStr: formatEntryRowAmount(amount.text, amount.value),
    isPositive: amount.value > 0,
  };
};

interface EntryRowProps {
  entry: JournalDirectiveType;
  onPress?: () => void;
}

export const EntryRow: React.FC<EntryRowProps> = ({ entry, onPress }) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);

  const { name, amountStr, isPositive } = getDisplayInfo(entry);
  const secondary = isJournalTransaction(entry)
    ? entryRowSecondaryText(entry)
    : null;
  const isPending = isJournalTransaction(entry) && entry.flag === "!";
  // Brand text for the logo: payee/narration only (not the directive_type
  // fallback), so non-transactions match on their account instead.
  const brandText = isJournalTransaction(entry)
    ? entry.payee || entry.narration || undefined
    : undefined;

  const leading = (
    <>
      <AccountTypeIcon postings={getEntryPostings(entry)} payee={brandText} />

      <View style={styles.middle}>
        <View style={styles.nameColumn}>
          <Text style={styles.name} numberOfLines={stacked ? undefined : 1}>
            {name}
          </Text>
          {secondary ? (
            <Text
              style={styles.secondary}
              numberOfLines={stacked ? undefined : 1}
            >
              {secondary}
            </Text>
          ) : null}
        </View>
        {isPending && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>P</Text>
          </View>
        )}
      </View>
    </>
  );

  const content = (
    <>
      {stacked ? <View style={styles.stackedMain}>{leading}</View> : leading}
      {amountStr ? (
        <AmountText
          mono="medium"
          style={[
            styles.amount,
            stacked && styles.amountStacked,
            isPositive ? styles.amountPositive : styles.amountNeutral,
          ]}
        >
          {amountStr}
        </AmountText>
      ) : (
        <AmountText
          mono="medium"
          style={[
            styles.amount,
            stacked && styles.amountStacked,
            { color: theme.black60 },
          ]}
        >
          {entry.directive_type}
        </AmountText>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.row, stacked && styles.rowStacked]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>{content}</View>
  );
};
