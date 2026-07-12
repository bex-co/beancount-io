import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSession } from "@/common/hooks/use-session";
import { getCurrencySymbol } from "@/common/currency-util";
import { LedgerDrawerHeader } from "@/components/ledger-drawer/ledger-drawer-header";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { Tabs } from "@/components/tabs";
import { TimeRangePills } from "@/components/time-range-pills";
import { RANGE_LABEL_KEYS, TIME_RANGES, TimeRange } from "@/common/series-util";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { useIncomeStatement } from "./hooks/use-income-statement";
import { SpendingReport } from "./components/spending-report";
import { IncomeReport } from "./components/income-report";
import { CashFlowReport } from "./components/cash-flow-report";

export type ReportType = "spending" | "income" | "cashFlow";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    tabsContainer: {
      flex: 1,
    },
  });

type SharedReportProps = {
  ledgerId: string;
  currency: string;
  currencySymbol: string;
  timeRange: TimeRange;
  refreshing: boolean;
  onRefresh: () => void;
};

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

  const handleTabChange = useCallback((index: number) => {
    const types: ReportType[] = ["cashFlow", "spending", "income"];
    analytics.track("reports_segment_change", { segment: types[index] });
  }, []);

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

  const sharedProps: SharedReportProps = {
    ledgerId,
    currency,
    currencySymbol,
    timeRange,
    refreshing,
    onRefresh,
  };

  const tabs = [
    {
      key: "cashFlow",
      title: t("cashFlow"),
      component: (
        <CashFlowReport
          {...sharedProps}
          loading={incomeLoading}
          incomeData={incomeData}
        />
      ),
    },
    {
      key: "spending",
      title: t("spending"),
      component: (
        <SpendingReport
          {...sharedProps}
          loading={incomeLoading}
          incomeData={incomeData}
        />
      ),
    },
    {
      key: "income",
      title: t("income"),
      component: (
        <IncomeReport
          {...sharedProps}
          loading={incomeLoading}
          incomeData={incomeData}
        />
      ),
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <LedgerDrawerHeader title={t("reports")} />
      <TimeRangePills
        value={timeRange}
        options={rangeOptions}
        onChange={handleRangeChange}
      />
      <View style={styles.tabsContainer}>
        <Tabs
          tabs={tabs}
          initialIndex={0}
          onTabChange={handleTabChange}
          scrollable={false}
        />
      </View>
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
