import { isolateAccountPath } from "@/common/bidi";
import React from "react";
import { Text, View, StyleSheet, useWindowDimensions } from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { fonts, fontSizes, fontWeights } from "@/common/theme";
import { prefersStackedLayout } from "@/common/theme/dynamic-type";
import { AmountText } from "@/components/amount-text";
import { ColorTheme } from "@/types/theme-props";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import {
  stacksBalanceRow,
  type EntryBalanceRow,
} from "./format-entry-balances";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    balanceSection: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black10,
    },
    balanceSectionHeader: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.black10,
    },
    balanceSectionHeaderText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    balanceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black10,
    },
    // At large text sizes the account takes the whole row and the amounts sit
    // beneath it, trailing, as Money flow's posting row does (w21/684).
    balanceRowStacked: {
      flexDirection: "column",
    },
    balanceAmountsStacked: {
      alignSelf: "flex-end",
      marginStart: 0,
      marginTop: 4,
    },
    balanceRowLast: {
      borderBottomWidth: 0,
    },
    balanceAccount: {
      fontSize: fontSizes.sm,
      fontFamily: fonts.mono,
      color: theme.text01,
      flex: 1,
      textAlign: LEADING_TEXT_ALIGN,
    },
    // One amount per line, so several currencies or lots stack instead of
    // squeezing the account name (w21/092).
    balanceAmounts: {
      alignItems: "flex-end",
      flexShrink: 0,
      marginStart: 12,
    },
    balanceAmount: {
      fontSize: fontSizes.sm,
      color: theme.text01,
      textAlign: "right",
    },
  });

interface BalanceSectionProps {
  title: string;
  balances: EntryBalanceRow[];
}

export const BalanceSection: React.FC<BalanceSectionProps> = ({
  title,
  balances,
}) => {
  const styles = useThemeStyle(getStyles);
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);

  if (balances.length === 0) {
    return null;
  }

  return (
    <View style={styles.balanceSection}>
      <View style={styles.balanceSectionHeader}>
        <Text
          style={styles.balanceSectionHeaderText}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </View>
      {balances.map((balance, index) => {
        const rowStacked = stacksBalanceRow(balance.amounts, stacked);
        return (
          <View
            key={index}
            style={[
              styles.balanceRow,
              rowStacked && styles.balanceRowStacked,
              index === balances.length - 1 && styles.balanceRowLast,
            ]}
          >
            <Text
              style={styles.balanceAccount}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {isolateAccountPath(balance.account)}
            </Text>
            <View
              style={[
                styles.balanceAmounts,
                rowStacked && styles.balanceAmountsStacked,
              ]}
            >
              {balance.amounts.map((amount, line) => (
                <AmountText
                  key={line}
                  mono="regular"
                  style={styles.balanceAmount}
                >
                  {amount}
                </AmountText>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};
