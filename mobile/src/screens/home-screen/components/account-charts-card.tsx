import { ReactNode, useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { AccountHierarchyQuery } from "@/generated-graphql/graphql";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { LoadingTile } from "@/components/loading-tile";
import { DashboardCard, PagedCarousel, TimeRangePills } from "@/components";
import { InteractiveLineChartD3 } from "@/common/d3/interactive-line-chart";
import { groupThousands } from "@/common/number-utils";
import { AccountListPage, selectAccountTree } from "@/components/account-list";
import {
  RANGE_LABEL_KEYS,
  SeriesPoint,
  TimeRange,
  TIME_RANGES,
  filterSeriesByRange,
  seriesToChartArray,
} from "@/screens/home-screen/selectors/select-net-worth-series";

const CARD_HEIGHT = 300;
const NET_WORTH_CHART_HEIGHT = 160;

type AccountTotals = {
  assets: string;
  liabilities: string;
};

type AccountChartsCardProps = {
  currency: string;
  currencySymbol: string;
  netWorthSeries: SeriesPoint[];
  accountTotals: AccountTotals;
  hierarchyData?: AccountHierarchyQuery;
  loading: boolean;
  error: boolean;
};

/**
 * Top-of-dashboard card that pages horizontally across (1) an interactive net
 * worth chart, (2) the user's Asset accounts, and (3) their Liability accounts.
 * Mirrors Monarch's swipeable account card.
 */
export function AccountChartsCard({
  currency,
  currencySymbol,
  netWorthSeries,
  accountTotals,
  hierarchyData,
  loading,
  error,
}: AccountChartsCardProps): JSX.Element {
  const { t } = useTranslations();
  const router = useRouter();
  const [scrubbing, setScrubbing] = useState(false);
  const [range, setRange] = useState<TimeRange>("6M");

  const handlePressAccount = useCallback(
    (account: string) => {
      analytics.track("home_open_account", { account });
      router.push({ pathname: "/account-detail", params: { account } });
    },
    [router],
  );

  // Memoize the recursive account-tree walks so scrub/range re-renders don't
  // rebuild them (they only depend on currency + hierarchy data).
  const assetAccounts = useMemo(
    () => selectAccountTree(currency, "assets", hierarchyData),
    [currency, hierarchyData],
  );
  const liabilityAccounts = useMemo(
    () => selectAccountTree(currency, "liabilities", hierarchyData),
    [currency, hierarchyData],
  );

  if (loading || error) {
    return (
      <DashboardCard bleed>
        <LoadingTile height={CARD_HEIGHT} mx={16} />
      </DashboardCard>
    );
  }

  const netWorthChart = seriesToChartArray(
    filterSeriesByRange(netWorthSeries, range),
    t("noDataCharts"),
  );
  const rangeOptions = TIME_RANGES.map((key) => ({
    key,
    label: t(RANGE_LABEL_KEYS[key]),
  }));

  const pages: ReactNode[] = [
    <View key="net-worth">
      <InteractiveLineChartD3
        label={t("netWorth")}
        labels={netWorthChart.labels}
        numbers={netWorthChart.numbers}
        currencySymbol={currencySymbol}
        height={NET_WORTH_CHART_HEIGHT}
        onScrubStart={() => setScrubbing(true)}
        onScrubEnd={() => setScrubbing(false)}
      />
      <TimeRangePills
        value={range}
        options={rangeOptions}
        onChange={(next) => {
          setRange(next);
          analytics.track("home_net_worth_range", { range: next });
        }}
      />
    </View>,
    <AccountListPage
      key="assets"
      label={t("assets")}
      total={`${currencySymbol}${groupThousands(Number(accountTotals.assets))}`}
      items={assetAccounts}
      currencySymbol={currencySymbol}
      onPressAccount={handlePressAccount}
    />,
    <AccountListPage
      key="liabilities"
      label={t("liabilities")}
      total={`${currencySymbol}${groupThousands(
        Number(accountTotals.liabilities),
      )}`}
      items={liabilityAccounts}
      currencySymbol={currencySymbol}
      onPressAccount={handlePressAccount}
    />,
  ];

  return (
    <DashboardCard bleed>
      <PagedCarousel
        pages={pages}
        height={CARD_HEIGHT}
        scrollEnabled={!scrubbing}
        onPageChange={(index) => analytics.track("home_chart_page", { index })}
      />
    </DashboardCard>
  );
}
