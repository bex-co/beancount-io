import { useCallback, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSession } from "@/common/hooks/use-session";
import { getCurrencySymbol } from "@/common/currency-util";
import { gutter } from "@/common/theme";
import { LedgerDrawerHeader } from "@/components/ledger-drawer/ledger-drawer-header";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { DashboardCard } from "@/components/dashboard-card";
import { DashboardScrollView } from "@/components/dashboard-scroll-view";
import { LoadingTile } from "@/components/loading-tile";
import { IncomeExpenseBarChartD3 } from "@/common/d3/income-expense-bar-chart";
import { TimeRangePills } from "@/components/time-range-pills";
import {
  RANGE_LABEL_KEYS,
  TIME_RANGES,
  TimeRange,
  alignMonthlySeries,
  filterSeriesByRange,
  pointsToMonthlySeries,
} from "@/common/series-util";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useIncomeStatement } from "./hooks/use-income-statement";
import { selectRangedAccountTree } from "./selectors/select-ranged-account-tree";
import { topNWithOther } from "./selectors/select-breakdown-rows";
import {
  CategoryBreakdown,
  CategoryBreakdownSkeleton,
} from "./components/category-breakdown";
import { AccountTransactionsCard } from "./components/account-transactions-card";
import { reportScrollStyles } from "./components/report-scroll-style";

/** How many top categories to show before folding the tail into "Other". */
const BREAKDOWN_TOP_N = 7;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
  });

const ReportsScreenImpl = (): JSX.Element => {
  const { userId } = useSession();
  const ledgerId = useLedgerGuard();
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  usePageView("reports");

  const [timeRange, setTimeRange] = useState<TimeRange>("6M");
  const [refreshing, setRefreshing] = useState(false);

  const { currencies } = useLedgerMeta(userId);
  const currency = currencies.length > 0 ? currencies[0] : "USD";
  const currencySymbol = getCurrencySymbol(currency);

  const {
    data: incomeData,
    loading: incomeLoading,
    refetch: incomeRefetch,
  } = useIncomeStatement(ledgerId);
  const stmt = incomeData?.getLedgerIncomeStatement;

  const handleRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
    analytics.track("reports_range_change", { range });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await incomeRefetch();
    } finally {
      setRefreshing(false);
    }
  }, [incomeRefetch]);

  const rangeOptions = TIME_RANGES.map((key) => ({
    key,
    label: t(RANGE_LABEL_KEYS[key]),
  }));

  // Combined chart: income (negated to a positive magnitude) and expense bars
  // plus the signed net line, each range-filtered then aligned onto one axis.
  const chart = useMemo(() => {
    const income = pointsToMonthlySeries(currency, stmt?.incomeData ?? []).map(
      (point) => ({ ...point, value: -point.value }),
    );
    const expense = pointsToMonthlySeries(currency, stmt?.expensesData ?? []);
    const net = pointsToMonthlySeries(currency, stmt?.netProfitData ?? []);
    return alignMonthlySeries({
      income: filterSeriesByRange(income, timeRange),
      expense: filterSeriesByRange(expense, timeRange),
      net: filterSeriesByRange(net, timeRange),
    });
  }, [currency, stmt, timeRange]);

  const expense = useMemo(
    () =>
      selectRangedAccountTree(
        currency,
        stmt?.expensesData ?? [],
        timeRange,
        "expenses",
      ),
    [currency, stmt, timeRange],
  );
  const income = useMemo(
    () =>
      selectRangedAccountTree(
        currency,
        stmt?.incomeData ?? [],
        timeRange,
        "income",
      ),
    [currency, stmt, timeRange],
  );

  const isLoading = incomeLoading && !incomeData;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <LedgerDrawerHeader title={t("reports")} />
      <TimeRangePills
        value={timeRange}
        options={rangeOptions}
        onChange={handleRangeChange}
      />
      <DashboardScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={reportScrollStyles.content}
      >
        <DashboardCard bleed>
          {isLoading ? (
            <LoadingTile height={220} mx={gutter} />
          ) : (
            <IncomeExpenseBarChartD3
              currencySymbol={currencySymbol}
              months={chart.months}
              income={chart.income}
              expense={chart.expense}
              net={chart.net}
            />
          )}
        </DashboardCard>

        {isLoading ? (
          <CategoryBreakdownSkeleton />
        ) : (
          <DashboardCard bleed>
            <CategoryBreakdown
              label={t("expenses")}
              total={expense.total}
              items={topNWithOther(expense.tree, BREAKDOWN_TOP_N, t("other"))}
              currencySymbol={currencySymbol}
              tone={(theme) => theme.error}
              section="expenses"
            />
          </DashboardCard>
        )}

        {isLoading ? (
          <CategoryBreakdownSkeleton />
        ) : (
          <DashboardCard bleed>
            <CategoryBreakdown
              label={t("income")}
              total={income.total}
              items={topNWithOther(income.tree, BREAKDOWN_TOP_N, t("other"))}
              currencySymbol={currencySymbol}
              tone={(theme) => theme.success}
              section="income"
            />
          </DashboardCard>
        )}

        <AccountTransactionsCard
          ledgerId={ledgerId}
          accountPrefix={["Income", "Expenses"]}
          titleKey="recentTransactions"
          emptyKey="recentTransactionsEmpty"
          timeRange={timeRange}
          refreshing={refreshing}
        />
      </DashboardScrollView>
    </SafeAreaView>
  );
};

export const ReportsScreen = (): JSX.Element => {
  return (
    <LedgerGuard>
      <ReportsScreenImpl />
    </LedgerGuard>
  );
};
