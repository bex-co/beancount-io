import { useMemo } from "react";
import { DashboardCard } from "@/components/dashboard-card";
import { LoadingTile } from "@/components/loading-tile";
import { BarChartD3 } from "@/common/d3/bar-chart-d3";
import {
  TimeRange,
  filterSeriesByRange,
  pointsToMonthlySeries,
  seriesToChartArray,
} from "@/common/series-util";
import { useTranslations } from "@/common/hooks/use-translations";
import { IncomeStatementQuery } from "@/generated-graphql/graphql";
import { DashboardScrollView } from "@/components/dashboard-scroll-view";
import { AccountTransactionsCard } from "./account-transactions-card";
import { reportScrollStyles } from "./report-scroll-style";

type Props = {
  ledgerId: string;
  currency: string;
  currencySymbol: string;
  timeRange: TimeRange;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  incomeData: IncomeStatementQuery | undefined;
};

export function SpendingReport({
  ledgerId,
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
      incomeData?.getLedgerIncomeStatement?.expensesData ?? [],
    );
    const filtered = filterSeriesByRange(series, timeRange);
    return seriesToChartArray(filtered, t("noDataCharts"));
  }, [currency, incomeData, timeRange, t]);

  const isLoading = loading && !incomeData;

  return (
    <DashboardScrollView
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={reportScrollStyles.content}
    >
      <DashboardCard title={t("spending")} bleed>
        {isLoading ? (
          <LoadingTile height={220} mx={16} />
        ) : (
          <BarChartD3
            currencySymbol={currencySymbol}
            labels={chart.labels}
            numbers={chart.numbers}
          />
        )}
      </DashboardCard>
      <AccountTransactionsCard
        ledgerId={ledgerId}
        accountPrefix="Expenses"
        titleKey="expenseTransactions"
        emptyKey="expenseTransactionsEmpty"
        timeRange={timeRange}
        refreshing={refreshing}
      />
    </DashboardScrollView>
  );
}
