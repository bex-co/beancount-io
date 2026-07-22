import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { fonts, fontSizes, fontWeights } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { ColorTheme } from "@/types/theme-props";

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
    balanceRowLast: {
      borderBottomWidth: 0,
    },
    balanceAccount: {
      fontSize: fontSizes.sm,
      fontFamily: fonts.mono,
      color: theme.text01,
      flex: 1,
    },
    balanceAmount: {
      fontSize: fontSizes.sm,
      color: theme.text01,
      textAlign: "right",
    },
  });

interface BalanceSectionProps {
  title: string;
  balances: { account: string; amount: string }[];
}

export const BalanceSection: React.FC<BalanceSectionProps> = ({
  title,
  balances,
}) => {
  const styles = useThemeStyle(getStyles);

  if (balances.length === 0) {
    return null;
  }

  return (
    <View style={styles.balanceSection}>
      <View style={styles.balanceSectionHeader}>
        <Text style={styles.balanceSectionHeaderText}>{title}</Text>
      </View>
      {balances.map((balance, index) => (
        <View
          key={index}
          style={[
            styles.balanceRow,
            index === balances.length - 1 && styles.balanceRowLast,
          ]}
        >
          <Text style={styles.balanceAccount}>{balance.account}</Text>
          <AmountText mono="regular" style={styles.balanceAmount}>
            {balance.amount}
          </AmountText>
        </View>
      ))}
    </View>
  );
};
