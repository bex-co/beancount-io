import { isolateLtr } from "@/common/bidi";
import { journalChangeTone } from "@/screens/account-detail-screen/selectors/select-change-tone";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  formatSignedMoneyWithCurrency,
  formatUnits,
} from "@/common/number-utils";
import {
  formatAccountJournalBalance,
  formatAccountJournalChange,
} from "@/screens/account-detail-screen/utils/format-account-journal-balance";
import {
  AccountJournalRow,
  directiveTypeLabelKey,
  formatOtherChanges,
} from "@/screens/account-detail-screen/selectors/select-account-journal";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import {
  entryFlagBadge,
  entryFlagBadgeText,
} from "@/screens/transactions-screen/entry-row/entry-row-flag";
import { entryRowUpcomingLine } from "@/screens/transactions-screen/entry-row/entry-row-date";
import { prefersStackedLayout } from "@/common/theme/dynamic-type";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
    },
    // Accessibility text sizes (see `prefersStackedLayout`), as in the
    // Transactions EntryRow: change, cost and balance move under the icon and
    // name, so the name can wrap whole instead of shrinking to "Hoo…".
    rowStacked: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    stackedMain: {
      flexDirection: "row",
      alignItems: "center",
    },
    trailingStacked: {
      alignItems: "flex-start",
      marginTop: 4,
    },
    middleColumn: {
      flex: 1,
    },
    middle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    detail: {
      marginTop: 2,
      fontSize: fontSizes.sm,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      flexShrink: 1,
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
      color: theme.onWarning,
    },
    typeBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: theme.black10,
      flexShrink: 0,
    },
    typeBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    trailing: {
      alignItems: "flex-end",
    },
    change: {
      fontSize: fontSizes.md,
    },
    balance: {
      marginTop: 2,
      fontSize: fontSizes.xs,
      color: theme.black80,
    },
  });

type AccountEntryRowProps = {
  row: AccountJournalRow;
  currency: string;
  onPress?: () => void;
  /**
   * Which way a change moves net worth: 1 for Assets and Liabilities, -1 for
   * Income, Expenses and Equity. The change keeps its ledger sign; only its
   * color follows this, so salary reads favorable and spending does not.
   */
  netWorthSign?: 1 | -1;
  /** Today as a ledger date: a row dated after it reads Upcoming. */
  today?: string;
};

export function AccountEntryRow({
  row,
  currency,
  onPress,
  netWorthSign = 1,
  today,
}: AccountEntryRowProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  // Pending warns; a forecast, a pad or another flag is noted, and a row
  // dated after today reads Upcoming, as on Transactions. Only "!" was
  // marked, so a planned grocery run read as money spent (w21/781).
  const badge = entryFlagBadge(row.flag);
  const flagLabel =
    badge === null
      ? null
      : entryFlagBadgeText(badge, {
          pending: t("pending"),
          forecast: t("entryForecast"),
          pad: t("pad"),
        });
  // A commodity account's rows read in its units, with what each change cost.
  const { units } = row;
  // Moved only other currencies: show them, not a zero, and say they are
  // outside the running total (w21/100). Moved both: the other leg goes on a
  // line of its own under the shown change (w21/421).
  const otherChanges = row.otherChanges ?? [];
  const onlyOthers = otherChanges.length > 0 && row.change === 0;
  const changeText = onlyOthers
    ? formatOtherChanges(otherChanges)
    : units
      ? formatUnits(row.change, units.currency, units.scale, true)
      : formatAccountJournalChange(row.change, currency, row.moneyScale ?? 2);
  const notInTotalText =
    otherChanges.length === 0
      ? null
      : onlyOthers
        ? t("valuationNotInTotalTag")
        : `${formatOtherChanges(otherChanges)} · ${t("valuationNotInTotalTag")}`;
  const balanceText = units
    ? formatUnits(row.balance, units.currency, units.scale)
    : formatAccountJournalBalance(row.balance, currency, row.moneyScale ?? 2);
  // Open / Balance / Pad / … rows read as plain transactions otherwise: the
  // title falls back to the directive's own account name.
  const typeLabelKey = directiveTypeLabelKey(row.directiveType);
  // A split's units read neutral, not as a gain (w21/713). The neutral is
  // text, so it is the secondary-text stone, not the placeholder grey.
  const tone = journalChangeTone(row.change, netWorthSign, units?.cost);
  const changeColor =
    tone === "up"
      ? theme.success
      : tone === "down"
        ? theme.error
        : theme.black80;

  const title = row.title || t("transaction");
  const costText =
    units && units.cost !== null
      ? t("atCost", {
          amount: isolateLtr(
            formatSignedMoneyWithCurrency(units.cost, currency, true),
          ),
        })
      : null;
  // Amounts are isolated so a Persian label cannot reorder their signs and
  // symbols (w21/095).
  const balanceLine = `${t("balance")}: ${isolateLtr(balanceText)}`;
  const detail = row.detail;
  const directiveDetail =
    detail === undefined
      ? null
      : detail.kind === "balance"
        ? `${t("balance")} ${isolateLtr(detail.amount)}`
        : detail.text;
  const detailText =
    today === undefined
      ? directiveDetail
      : entryRowUpcomingLine({
          date: row.date,
          today,
          upcomingLabel: t("entryUpcoming"),
          secondary: directiveDetail,
        });
  const offByText =
    detail?.kind === "balance" && detail.offBy
      ? t("balanceOffBy", { amount: isolateLtr(detail.offBy) })
      : null;

  const leading = (
    <>
      {/* Decorative: its glyph was a focus stop of its own (w21/141). */}
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <AccountTypeIcon postings={row.postings} payee={row.payee} />
      </View>

      <View style={styles.middleColumn}>
        <View style={styles.middle}>
          <Text style={styles.title} numberOfLines={stacked ? undefined : 1}>
            {title}
          </Text>
          {typeLabelKey && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{t(typeLabelKey)}</Text>
            </View>
          )}
          {badge?.kind === "pending" && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>!</Text>
            </View>
          )}
          {badge && badge.kind !== "pending" && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{flagLabel}</Text>
            </View>
          )}
        </View>
        {detailText !== null ? (
          <Text
            testID="account-entry-detail"
            style={styles.detail}
            numberOfLines={stacked ? undefined : 2}
          >
            {detailText}
          </Text>
        ) : null}
        {offByText !== null ? (
          <AmountText
            testID="account-entry-off-by"
            style={[styles.detail, { color: theme.error }]}
          >
            {offByText}
          </AmountText>
        ) : null}
      </View>
    </>
  );

  const content = (
    <>
      {stacked ? <View style={styles.stackedMain}>{leading}</View> : leading}
      <View style={[styles.trailing, stacked && styles.trailingStacked]}>
        <AmountText
          mono="medium"
          style={[styles.change, { color: changeColor }]}
        >
          {changeText}
        </AmountText>
        {notInTotalText !== null ? (
          <Text style={styles.balance}>{notInTotalText}</Text>
        ) : null}
        {costText !== null ? (
          <AmountText style={styles.balance}>{costText}</AmountText>
        ) : null}
        <AmountText style={styles.balance}>{balanceLine}</AmountText>
      </View>
    </>
  );

  // One name for the whole row, read from the visible text. The label also
  // keeps the type icon's glyph out of the name.
  // The type chip (Open, Close, Pad, Note, Balance) is part of it: Open, Pad and
  // Close rows read alike without it (w21/559).
  const accessibilityLabel = [
    title,
    typeLabelKey ? t(typeLabelKey) : null,
    detailText,
    offByText,
    changeText,
    notInTotalText,
    costText,
    balanceLine,
    flagLabel,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.row, stacked && styles.rowStacked]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.row, stacked && styles.rowStacked]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </View>
  );
}
