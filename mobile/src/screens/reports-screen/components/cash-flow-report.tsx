import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { DashboardCard } from "@/components/dashboard-card";
import { LoadingTile } from "@/components/loading-tile";
import { AccountListPage } from "@/components/account-list";
import { InteractiveLineChartD3 } from "@/common/d3/interactive-line-chart";
import {
  TimeRange,
  filterSeriesByRange,
  pointsToMonthlySeries,
  seriesToChartArray,
} from "@/common/series-util";
import { groupThousands } from "@/common/number-utils";
import {
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  sectionHeaderPaddingVertical,
} from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { IncomeStatementQuery } from "@/generated-graphql/graphql";
import { DashboardScrollView } from "@/components/dashboard-scroll-view";
import { selectRangedAccountTree } from "../selectors/select-ranged-account-tree";
import { reportScrollStyles } from "./report-scroll-style";

type Props = {
  currency: string;
  currencySymbol: string;
  timeRange: TimeRange;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  incomeData: IncomeStatementQuery | undefined;
};

// Vary tile widths across rows so the skeleton reads as content, not stripes
// (mirrors the loaded account-list rows: a label + a right-aligned amount).
const SKELETON_ROWS = [
  { labelWidth: 110, valueWidth: 84 },
  { labelWidth: 150, valueWidth: 70 },
  { labelWidth: 92, valueWidth: 96 },
];

const skeletonStyles = StyleSheet.create({
  header: {
    paddingHorizontal: gutter,
    marginBottom: sectionHeaderPaddingVertical,
  },
  label: {
    marginBottom: 6,
  },
  // Mirrors the loaded AccountListPage row rhythm so nothing shifts on load.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: gutter,
    paddingVertical: rowPaddingVertical,
    minHeight: rowMinHeight,
  },
});

/** Skeleton mirroring one DashboardCard + AccountListPage (header + rows). */
function AccountBreakdownSkeleton() {
  return (
    <DashboardCard bleed>
      <View style={skeletonStyles.header}>
        <LoadingTile width={90} height={14} style={skeletonStyles.label} />
        <LoadingTile width={120} height={26} />
      </View>
      {SKELETON_ROWS.map((row, index) => (
        <View key={index} style={skeletonStyles.row}>
          <LoadingTile width={row.labelWidth} height={14} />
          <LoadingTile width={row.valueWidth} height={14} />
        </View>
      ))}
    </DashboardCard>
  );
}

export function CashFlowReport({
  currency,
  currencySymbol,
  timeRange,
  loading,
  refreshing,
  onRefresh,
  incomeData,
}: Props): JSX.Element {
  const { t } = useTranslations();

  const chart = useMemo(() => {
    const series = pointsToMonthlySeries(
      currency,
      incomeData?.getLedgerIncomeStatement?.netProfitData ?? [],
    );
    const filtered = filterSeriesByRange(series, timeRange);
    return seriesToChartArray(filtered, t("noDataCharts"));
  }, [currency, incomeData, timeRange, t]);

  // Income/Expense breakdowns sliced to the selected range — same expandable
  // tree the Accounts tab renders. We sum the monthly per-account series
  // (`incomeData`/`expensesData`) across the range window because the hierarchy
  // snapshots are full-period. `total` is the sum of the displayed rows, so the
  // headline always matches.
  const income = useMemo(
    () =>
      selectRangedAccountTree(
        currency,
        incomeData?.getLedgerIncomeStatement?.incomeData ?? [],
        timeRange,
        "income",
      ),
    [currency, incomeData, timeRange],
  );
  const expense = useMemo(
    () =>
      selectRangedAccountTree(
        currency,
        incomeData?.getLedgerIncomeStatement?.expensesData ?? [],
        timeRange,
        "expenses",
      ),
    [currency, incomeData, timeRange],
  );

  const formatTotal = (total: number) =>
    `${currencySymbol}${groupThousands(total)}`;

  const isLoading = loading && !incomeData;

  return (
    <DashboardScrollView
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={reportScrollStyles.content}
    >
      <DashboardCard bleed>
        {isLoading ? (
          <LoadingTile height={240} mx={16} />
        ) : (
          <InteractiveLineChartD3
            // label={t("cashFlow")}
            currencySymbol={currencySymbol}
            labels={chart.labels}
            numbers={chart.numbers}
          />
        )}
      </DashboardCard>

      {isLoading ? (
        <>
          <AccountBreakdownSkeleton />
          <AccountBreakdownSkeleton />
        </>
      ) : (
        <>
          <DashboardCard bleed>
            <AccountListPage
              label={t("income")}
              total={formatTotal(income.total)}
              items={income.tree}
              currencySymbol={currencySymbol}
              scrollable={false}
            />
          </DashboardCard>
          <DashboardCard bleed>
            <AccountListPage
              label={t("expenses")}
              total={formatTotal(expense.total)}
              items={expense.tree}
              currencySymbol={currencySymbol}
              scrollable={false}
            />
          </DashboardCard>
        </>
      )}
    </DashboardScrollView>
  );
}
