import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import type { RootNames } from "@/common/account-root";
import { useLedgerRootNames } from "@/common/hooks/use-ledger-root-names";
import { useOperatingCurrency } from "@/common/hooks/use-operating-currency";
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
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { selectEntryRowAmount } from "./format-entry-row-amount";
import { entryRowSecondaryText, entryRowTitle } from "./entry-row-secondary";
import { entryRowDateLine, entryRowUpcomingLine } from "./entry-row-date";
import { entryFlagBadge } from "./entry-row-flag";
import { entryRowAccessibilityLabel } from "./entry-row-accessibility-label";

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
      color: theme.black80,
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
    // A forecast, a pad or another flag: noted, not a warning; account
    // detail's type chip.
    neutralBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: theme.black10,
    },
    neutralBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    typeLabel: {
      fontSize: fontSizes.xs,
      color: theme.black80,
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
  mixedLabel: string,
  untitledLabel: string,
  operatingCurrency: string | undefined,
  roots: RootNames,
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

  // A bare transaction is titled in the app's language, not by its English
  // directive type (w21/241).
  const name = entryRowTitle(entry) ?? untitledLabel;

  return {
    name,
    ...selectEntryRowAmount(entry, mixedLabel, operatingCurrency, roots),
  };
};

interface EntryRowProps {
  entry: JournalDirectiveType;
  onPress?: () => void;
  /**
   * Show the entry's date under its name, judged against this day (the cards
   * that list recent entries have no date headers; w21/261).
   */
  dateToday?: string;
  /**
   * Mark an entry dated after this day "Upcoming", on a list whose date
   * headers already name the day (Transactions; w21/746).
   */
  upcomingAfter?: string;
}

export const EntryRow: React.FC<EntryRowProps> = ({
  entry,
  onPress,
  dateToday,
  upcomingAfter,
}) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);

  const { t, locale } = useTranslations();
  const operatingCurrency = useOperatingCurrency();
  const roots = useLedgerRootNames();
  const { name, amountStr, isPositive } = getDisplayInfo(
    entry,
    t("multiplePostings"),
    t("transaction"),
    operatingCurrency,
    roots,
  );
  const narration = isJournalTransaction(entry)
    ? entryRowSecondaryText(entry)
    : null;
  const secondary =
    dateToday !== undefined
      ? entryRowDateLine({
          date: entry.date,
          today: dateToday,
          locale,
          upcomingLabel: t("entryUpcoming"),
          secondary: narration,
        })
      : upcomingAfter !== undefined
        ? entryRowUpcomingLine({
            date: entry.date,
            today: upcomingAfter,
            upcomingLabel: t("entryUpcoming"),
            secondary: narration,
          })
        : narration;
  const badge = isJournalTransaction(entry) ? entryFlagBadge(entry.flag) : null;
  const badgeText =
    badge === null
      ? null
      : badge.kind === "pending"
        ? "!"
        : badge.kind === "forecast"
          ? t("entryForecast")
          : badge.kind === "padding"
            ? t("pad")
            : badge.flag;
  const flagLabel = badge?.kind === "pending" ? t("pending") : badgeText;
  // Brand text for the logo: payee/narration only (not the directive_type
  // fallback), so non-transactions match on their account instead.
  const brandText = isJournalTransaction(entry)
    ? entryRowTitle(entry)
    : undefined;

  const leading = (
    <>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <AccountTypeIcon postings={getEntryPostings(entry)} payee={brandText} />
      </View>

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
        {badge?.kind === "pending" && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>!</Text>
          </View>
        )}
        {badge && badge.kind !== "pending" && (
          <View style={styles.neutralBadge}>
            <Text style={styles.neutralBadgeText}>{badgeText}</Text>
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
            { color: theme.black80 },
          ]}
        >
          {isJournalTransaction(entry)
            ? t("transaction")
            : entry.directive_type}
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
        accessibilityRole="button"
        accessibilityLabel={entryRowAccessibilityLabel({
          name,
          secondary,
          amountStr,
          flagLabel,
        })}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>{content}</View>
  );
};
