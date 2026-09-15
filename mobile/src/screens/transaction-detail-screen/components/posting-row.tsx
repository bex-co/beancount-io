import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import {
  fonts,
  fontSizes,
  fontWeights,
  prefersStackedLayout,
  useTheme,
} from "@/common/theme";
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
    // Accessibility text sizes (see `prefersStackedLayout`): the account keeps
    // the row's full width and the amount moves to its own line, instead of an
    // unshrinkable amount leaving the account four characters ("E…ax").
    rowStacked: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: 6,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    accountColumn: {
      flex: 1,
      minWidth: 0,
    },
    // In a column, `flex: 1` would size the account column from zero height.
    accountColumnStacked: {
      flex: 0,
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
    stackedAmountLine: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
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
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);

  const amount = (
    <AmountText mono="medium" style={styles.amount}>
      {posting.amount}
    </AmountText>
  );
  const chevron = (
    <Ionicons
      name={directionalIcon("chevron-forward")}
      size={16}
      color={theme.black60}
    />
  );

  return (
    <TouchableOpacity
      style={[
        styles.row,
        stacked && styles.rowStacked,
        showDivider && styles.rowDivider,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${directionLabel ? `${directionLabel}: ` : ""}${posting.account}, ${posting.amount}`}
    >
      <View
        style={[styles.accountColumn, stacked && styles.accountColumnStacked]}
      >
        {directionLabel ? (
          // One line at every size: a short uppercase label must never break
          // inside the word ("FRO" / "M").
          <Text style={styles.direction} numberOfLines={1}>
            {directionLabel}
          </Text>
        ) : null}
        <Text style={styles.account} numberOfLines={1} ellipsizeMode="middle">
          {posting.account}
        </Text>
      </View>
      {stacked ? (
        <View style={styles.stackedAmountLine}>
          {amount}
          {chevron}
        </View>
      ) : (
        <>
          {amount}
          {chevron}
        </>
      )}
    </TouchableOpacity>
  );
}
