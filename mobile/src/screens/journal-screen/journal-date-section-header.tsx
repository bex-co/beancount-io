import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeStyle } from "@/common/hooks";
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
      fontSize: 13,
      fontWeight: "500",
      color: theme.black80,
    },
    total: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.black80,
    },
  });

interface JournalDateSectionHeaderProps {
  displayDate: string;
  total: string;
}

export const JournalDateSectionHeader: React.FC<
  JournalDateSectionHeaderProps
> = ({ displayDate, total }) => {
  const styles = useThemeStyle(getStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{displayDate}</Text>
      <Text style={styles.total}>{total}</Text>
    </View>
  );
};
