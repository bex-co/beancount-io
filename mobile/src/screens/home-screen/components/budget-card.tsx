import { isolateAccountPath } from "@/common/bidi";
import { useMemo } from "react";
import { BudgetSkeleton } from "./home-skeletons";
import { selectCardLoadState } from "@/common/apollo/card-load-state";
import { CardLoadFailure } from "@/components/card-load-failure";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, prefersStackedLayout, space } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  formatMoneyWithCurrency,
  formatSignedMoneyWithCurrency,
} from "@/common/number-utils";
import { AmountText, DashboardCard } from "@/components";
import { FadeInView } from "@/components/crossfade";
import { BudgetMeter } from "@/screens/budget-screen/components/budget-meter";
import { notInTotalNotes } from "@/common/balance-display";
import { useAccountCloseDates } from "@/common/hooks/use-account-close-dates";
import { closedBefore } from "@/common/account-close-dates";
import { useToday } from "@/common/hooks/use-today";
import { useBudgetGroups } from "@/screens/budget-screen/hooks/use-budget-groups";
import { useBudgetPanel } from "@/screens/home-screen/hooks/use-budget-panel";
import {
  budgetPanelRowAccessibilityValue,
  type BudgetPanelRow,
} from "@/screens/home-screen/selectors/select-budget-panel";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { useGuest } from "@/common/guest/guest-context";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      marginBottom: space.md,
    },
    rowLast: {
      marginBottom: 0,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: space.xs,
    },
    // At large text sizes the account takes the row and the amounts sit under
    // it, trailing: beside them both "Housing:Rent" and "Housing:Utilities" read
    // "Housing…" (w21/685).
    rowHeaderStacked: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    amountsStacked: {
      alignSelf: "flex-end",
    },
    account: {
      flex: 1,
      fontSize: fontSizes.md,
      color: theme.text01,
      marginEnd: space.sm,
      textAlign: LEADING_TEXT_ALIGN,
    },
    amounts: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    notInTotal: {
      marginTop: space.xs,
      fontSize: fontSizes.xs,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
    emptyRow: {
      paddingVertical: space.sm,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

type BudgetCardProps = {
  ledgerId?: string;
  refreshSignal?: number;
};

/**
 * Home panel: the few budgets closest to their limit, each as a progress row.
 * Taps through to the full budget page.
 */
export function BudgetCard({
  ledgerId,
  refreshSignal = 0,
}: BudgetCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t, locale } = useTranslations();
  // Keyed on the text size: iOS keeps a Text's old measurement when it
  // changes with the app open (mobile/AGENTS.md; w21/015).
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);
  const router = useRouter();
  const guest = useGuest();

  const {
    groups,
    loaded: groupsLoaded,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useBudgetGroups(ledgerId, refreshSignal);
  // A budget on an account that closed before today has nothing left to track:
  // a former job's income target read "Below target" every month and outranked
  // real overspends (w21/398).
  const closeDates = useAccountCloseDates(ledgerId);
  const today = useToday();
  const liveGroups = useMemo(
    () => groups.filter((g) => !closedBefore(g.account, today, closeDates)),
    [groups, today, closeDates],
  );
  const {
    rows,
    loading: rowsLoading,
    failed: rowsFailed,
    retry: retryRows,
  } = useBudgetPanel({
    ledgerId,
    groups: liveGroups,
    refreshSignal,
  });
  // A failed read is not "no budgets" and not "$0.00 spent" (w21/080).
  const groupsFailed =
    selectCardLoadState({
      loading: groupsLoading,
      hasData: groupsLoaded,
      error: groupsError,
    }) === "failed";

  const openBudget = () => {
    if (guest) {
      guest.requestSignIn();
      return;
    }
    router.push({ pathname: "/budget" });
  };

  // `useBudgetPanel` settles to no rows for a ledger with no budgets, so an
  // empty `rows` with nothing in flight is the genuine empty state.
  const showSkeleton = (groupsLoading || rowsLoading) && rows.length === 0;

  const renderRow = (row: BudgetPanelRow, index: number) => (
    <TouchableOpacity
      key={`${row.account}::${row.currency}`}
      testID={`budget-row-${row.account}-${row.currency}`}
      style={[styles.row, index === rows.length - 1 && styles.rowLast]}
      onPress={openBudget}
      accessibilityRole="button"
      accessibilityLabel={row.account}
      accessibilityHint={guest ? t("guestSignInHint") : undefined}
      // The label collapses this subtree, so the amounts and the meter would
      // otherwise reach assistive tech not at all. `accessibilityValue.text` is
      // spoken after the label and repeats nothing from it.
      accessibilityValue={{
        text: budgetPanelRowAccessibilityValue(row, t, locale),
      }}
    >
      <View style={[styles.rowHeader, stacked && styles.rowHeaderStacked]}>
        <Text
          key={`account-${fontScale}`}
          style={styles.account}
          numberOfLines={1}
        >
          {isolateAccountPath(row.shortAccount)}
        </Text>
        <AmountText style={[styles.amounts, stacked && styles.amountsStacked]}>
          {`${formatSignedMoneyWithCurrency(row.actual, row.currency, false, row.scale)} / ${formatMoneyWithCurrency(row.budget, row.currency, row.scale)}`}
        </AmountText>
      </View>
      <BudgetMeter
        percent={row.progressPercent}
        favorable={row.unjudged ? null : row.favorable}
      />
      {notInTotalNotes(row.notInTotal, t).map((note) => (
        <Text key={note} style={styles.notInTotal}>
          {note}
        </Text>
      ))}
    </TouchableOpacity>
  );

  const renderBody = () => {
    if (showSkeleton) {
      return <BudgetSkeleton />;
    }
    if (groupsFailed) {
      return <CardLoadFailure onRetry={() => void refetchGroups()} />;
    }
    if (rowsFailed) {
      return <CardLoadFailure onRetry={retryRows} />;
    }
    if (rows.length === 0) {
      // A brand-new feature people won't look for: the panel keeps a row that
      // says what a budget is for rather than disappearing.
      return (
        <FadeInView>
          <TouchableOpacity
            style={styles.emptyRow}
            onPress={openBudget}
            accessibilityRole="button"
            accessibilityHint={guest ? t("guestSignInHint") : undefined}
          >
            <Text key={`empty-${fontScale}`} style={styles.emptyText}>
              {t(guest ? "budgetPanelEmptyGuest" : "budgetPanelEmpty")}
            </Text>
          </TouchableOpacity>
        </FadeInView>
      );
    }
    return <FadeInView>{rows.map(renderRow)}</FadeInView>;
  };

  return (
    // A guest has no Budget screen to see: the tap would only open sign-in,
    // unlabelled (w21/293).
    <DashboardCard
      title={t("budget")}
      onSeeAll={guest ? undefined : openBudget}
    >
      {renderBody()}
    </DashboardCard>
  );
}
