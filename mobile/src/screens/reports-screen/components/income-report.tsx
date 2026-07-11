import { useMemo } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useReactiveVar } from "@apollo/client";
import { themeVar } from "@/common/vars";
import { DashboardCard } from "@/components/dashboard-card";
import { LoadingTile } from "@/components/loading-tile";
import { CommonMargin } from "@/common/common-margin";
import { BarChartD3 } from "@/common/d3/bar-chart-d3";
import {
  TimeRange,
  filterSeriesByRange,
  pointsToMonthlySeries,
  seriesToChartArray,
} from "@/common/series-util";
import { useTranslations } from "@/common/hooks/use-translations";
import { IncomeStatementQuery } from "@/generated-graphql/graphql";

type Props = {
  currency: string;
  currencySymbol: string;
  timeRange: TimeRange;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  incomeData: IncomeStatementQuery | undefined;
};

export function IncomeReport({
  currency,
  currencySymbol,
  timeRange,
  loading,
  refreshing,
  onRefresh,
  incomeData,
}: Props): JSX.Element {
  const { t } = useTranslations();
  const currentTheme = useReactiveVar(themeVar);

  const chart = useMemo(() => {
    // Beancount income accounts are credit (negative balance) — negate to display as positive.
    const series = pointsToMonthlySeries(
      currency,
      incomeData?.getLedgerIncomeStatement?.incomeData ?? [],
    ).map((p) => ({ ...p, value: -p.value }));
    const filtered = filterSeriesByRange(series, timeRange);
    return seriesToChartArray(filtered, t("noDataCharts"));
  }, [currency, incomeData, timeRange, t]);

  const isLoading = loading && !incomeData;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={currentTheme === "dark" ? "white" : "black"}
        />
      }
    >
      <DashboardCard title={t("income")} bleed>
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
      <CommonMargin />
    </ScrollView>
  );
}
