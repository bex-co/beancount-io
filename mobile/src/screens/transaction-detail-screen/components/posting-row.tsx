import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { PostingDisplayRow } from "../selectors/select-transaction-detail";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
      backgroundColor: theme.white,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    account: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
      color: theme.primary,
    },
    amount: {
      fontSize: 14,
      fontWeight: "600",
      flexShrink: 0,
    },
  });

type PostingRowProps = {
  posting: PostingDisplayRow;
  showDivider: boolean;
  onPress: () => void;
};

export function PostingRow({
  posting,
  showDivider,
  onPress,
}: PostingRowProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  const amountColor =
    posting.sign > 0
      ? theme.success
      : posting.sign < 0
        ? theme.error
        : theme.black60;

  return (
    <TouchableOpacity
      style={[styles.row, showDivider && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.account} numberOfLines={1} ellipsizeMode="middle">
        {posting.account}
      </Text>
      <Text style={[styles.amount, { color: amountColor }]}>
        {posting.amount}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={theme.black60} />
    </TouchableOpacity>
  );
}
