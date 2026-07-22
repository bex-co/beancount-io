import { ReactNode, useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AccountHierarchyQuery } from "@/generated-graphql/graphql";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { LoadingTile } from "@/components/loading-tile";
import { DashboardCard, SegmentedPages, TimeRangePills } from "@/components";
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

// Pages lost their in-page title to the tab strip above, so they need ~20px
// less than they did under the dot indicator — the card's overall height is
// unchanged.
const CARD_HEIGHT = 280;
const NET_WORTH_CHART_HEIGHT = 160;
/** Widths of the skeleton's tab pills — uneven, so it reads as labels. */
const TAB_TILE_WIDTHS = [88, 64, 72];

const styles = StyleSheet.create({
  skeletonTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  skeletonTab: {
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
});

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
 * Top-of-dashboard card whose tab strip switches between (1) an interactive net
 * worth chart, (2) the user's Asset accounts, and (3) their Liability accounts.
 * Tabs rather than swipe + dots: the chart owns horizontal drags for scrubbing,
 * and the tab labels say what each page is where dots could not.
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
        <View style={styles.skeletonTabs}>
          {TAB_TILE_WIDTHS.map((width) => (
            <LoadingTile key={width} width={width} style={styles.skeletonTab} />
          ))}
        </View>
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

  // Pages carry no title of their own — the tab above already names them.
  const tabs = [t("netWorth"), t("assets"), t("liabilities")];
  const pages: ReactNode[] = [
    <View key="net-worth">
      <InteractiveLineChartD3
        labels={netWorthChart.labels}
        numbers={netWorthChart.numbers}
        currencySymbol={currencySymbol}
        height={NET_WORTH_CHART_HEIGHT}
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
      total={`${currencySymbol}${groupThousands(Number(accountTotals.assets))}`}
      items={assetAccounts}
      currencySymbol={currencySymbol}
      onPressAccount={handlePressAccount}
    />,
    <AccountListPage
      key="liabilities"
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
      <SegmentedPages
        tabs={tabs}
        pages={pages}
        height={CARD_HEIGHT}
        onPageChange={(index) => analytics.track("home_chart_page", { index })}
      />
    </DashboardCard>
  );
}
