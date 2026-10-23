import { isolateAccountPath } from "@/common/bidi";
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
import {
  PostingDisplayRow,
  postingBasisText,
} from "../selectors/select-transaction-detail";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  directionalIcon,
  LEADING_TEXT_ALIGN,
  letterSpacing,
} from "@/common/rtl";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: 16,
      paddingVertical: 13,
      backgroundColor: theme.controlFill,
    },
    line: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
      letterSpacing: letterSpacing(0.4),
    },
    account: {
      fontSize: fontSizes.sm,
      fontFamily: fonts.mono,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
      flexShrink: 1,
    },
    metaLine: {
      fontSize: fontSizes.xs,
      fontFamily: fonts.mono,
      color: theme.black80,
      marginTop: 2,
      textAlign: LEADING_TEXT_ALIGN,
    },
    accountLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    // The list row's pending "P", on the leg the `!` is on (w21/161).
    badge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: theme.warning,
    },
    badgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.onWarning,
    },
    amount: {
      fontSize: fontSizes.md,
      flexShrink: 0,
      color: theme.text01,
    },
    amountColumn: {
      flexShrink: 0,
      alignItems: "flex-end",
      // A long amount wraps here instead of squeezing the account name to
      // an ellipsis (w21/160).
      maxWidth: "60%",
    },
    // Its own line under the amount, the row's width less the chevron's (16)
    // and its gap (12): in the amount column a sale's "cost … · date · price
    // …" took 60% of the row and left the account "Asset…guard" (w21/779).
    basis: {
      fontSize: fontSizes.xs,
      color: theme.black80,
      marginTop: 4,
      paddingEnd: 28,
      textAlign: "right",
    },
    basisStacked: {
      paddingEnd: 0,
      textAlign: LEADING_TEXT_ALIGN,
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
  const { t } = useTranslations();
  const basis = postingBasisText(posting, t);

  const amount = (
    <View style={styles.amountColumn}>
      <AmountText mono="medium" style={styles.amount}>
        {posting.amount}
      </AmountText>
    </View>
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
      style={[styles.row, showDivider && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${directionLabel ? `${directionLabel}: ` : ""}${posting.account}, ${posting.amount}${basis ? `, ${basis}` : ""}${posting.pending ? `, ${t("pending")}` : ""}${posting.meta ? `, ${posting.meta.join(", ")}` : ""}`}
    >
      <View style={[styles.line, stacked && styles.rowStacked]}>
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
          <View style={styles.accountLine}>
            <Text
              style={styles.account}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {isolateAccountPath(posting.account)}
            </Text>
            {posting.pending ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>!</Text>
              </View>
            ) : null}
          </View>
          {posting.meta?.map((line) => (
            // Whole and selectable: a posting's `receipt: "https://…"` of 120
            // characters ended in "…" and could not be copied (w21/604).
            <Text style={styles.metaLine} key={line} selectable>
              {line}
            </Text>
          ))}
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
      </View>
      {basis ? (
        <Text style={[styles.basis, stacked && styles.basisStacked]}>
          {basis}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
