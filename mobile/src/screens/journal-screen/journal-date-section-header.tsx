import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { fontSizes, fontWeights } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { ColorTheme } from "@/types/theme-props";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: theme.black10,
    },
    date: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    total: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
  });

interface JournalDateSectionHeaderProps {
  displayDate: string;
  /**
   * Net change for the day, when it is a number worth trusting. Account detail
   * passes one — single account, normalized to the active currency. The journal
   * omits it: its entries span currencies and arrive a page at a time, so no
   * honest daily total can be computed from what is loaded.
   */
  total?: string;
}

export const JournalDateSectionHeader: React.FC<
  JournalDateSectionHeaderProps
> = ({ displayDate, total }) => {
  const styles = useThemeStyle(getStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{displayDate}</Text>
      {total ? <AmountText style={styles.total}>{total}</AmountText> : null}
    </View>
  );
};
