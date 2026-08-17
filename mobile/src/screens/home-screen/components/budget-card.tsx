import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, space } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { formatMoneyWithCurrency } from "@/common/number-utils";
import { AmountText, DashboardCard } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { BudgetMeter } from "@/screens/budget-screen/components/budget-meter";
import { useBudgetGroups } from "@/screens/budget-screen/hooks/use-budget-groups";
import { useBudgetPanel } from "@/screens/home-screen/hooks/use-budget-panel";
import type { BudgetPanelRow } from "@/screens/home-screen/selectors/select-budget-panel";

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
    account: {
      flex: 1,
      fontSize: fontSizes.md,
      color: theme.text01,
      marginRight: space.sm,
    },
    amounts: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    emptyRow: {
      paddingVertical: space.sm,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: theme.black80,
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
  const { t } = useTranslations();
  const router = useRouter();

  const { groups, loading: groupsLoading } = useBudgetGroups(
    ledgerId,
    refreshSignal,
  );
  const { rows, loading: rowsLoading } = useBudgetPanel({
    ledgerId,
    groups,
    refreshSignal,
  });

  const openBudget = () => {
    analytics.track("budget_panel_see_all", { rows: rows.length });
    router.push({ pathname: "/budget" });
  };

  // `useBudgetPanel` settles to no rows for a ledger with no budgets, so an
  // empty `rows` with nothing in flight is the genuine empty state.
  const showSkeleton = (groupsLoading || rowsLoading) && rows.length === 0;

  const renderRow = (row: BudgetPanelRow, index: number) => (
    <TouchableOpacity
      key={`${row.account}::${row.currency}`}
      style={[styles.row, index === rows.length - 1 && styles.rowLast]}
      onPress={openBudget}
      accessibilityRole="button"
      accessibilityLabel={row.account}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.account} numberOfLines={1}>
          {row.shortAccount}
        </Text>
        <AmountText style={styles.amounts}>
          {`${formatMoneyWithCurrency(row.actual, row.currency)} / ${formatMoneyWithCurrency(row.budget, row.currency)}`}
        </AmountText>
      </View>
      <BudgetMeter percent={row.progressPercent} favorable={row.favorable} />
    </TouchableOpacity>
  );

  const renderBody = () => {
    if (showSkeleton) {
      return (
        <>
          <LoadingTile height={34} />
          <LoadingTile height={34} />
        </>
      );
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
          >
            <Text style={styles.emptyText}>{t("budgetPanelEmpty")}</Text>
          </TouchableOpacity>
        </FadeInView>
      );
    }
    return <FadeInView>{rows.map(renderRow)}</FadeInView>;
  };

  return (
    <DashboardCard title={t("budget")} onSeeAll={openBudget}>
      {renderBody()}
    </DashboardCard>
  );
}
