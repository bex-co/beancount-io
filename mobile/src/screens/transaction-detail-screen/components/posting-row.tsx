import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { fonts, fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { PostingDisplayRow } from "../selectors/select-transaction-detail";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 12,
      backgroundColor: theme.controlFill,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    accountColumn: {
      flex: 1,
      minWidth: 0,
    },
    direction: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      marginBottom: 3,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    account: {
      fontSize: fontSizes.sm,
      fontFamily: fonts.mono,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
    },
    amount: {
      fontSize: fontSizes.md,
      flexShrink: 0,
      color: theme.text01,
    },
  });

type PostingRowProps = {
  posting: PostingDisplayRow;
  directionLabel?: string;
  showDivider: boolean;
  onPress: () => void;
};

export function PostingRow({
  posting,
  directionLabel,
  showDivider,
  onPress,
}: PostingRowProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  return (
    <TouchableOpacity
      style={[styles.row, showDivider && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${directionLabel ? `${directionLabel}: ` : ""}${posting.account}, ${posting.amount}`}
    >
      <View style={styles.accountColumn}>
        {directionLabel ? (
          <Text style={styles.direction}>{directionLabel}</Text>
        ) : null}
        <Text style={styles.account} numberOfLines={1} ellipsizeMode="middle">
          {posting.account}
        </Text>
      </View>
      <AmountText mono="medium" style={styles.amount}>
        {posting.amount}
      </AmountText>
      <Ionicons
        name={directionalIcon("chevron-forward")}
        size={16}
        color={theme.black60}
      />
    </TouchableOpacity>
  );
}
