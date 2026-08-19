import { useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { FadeInView } from "@/components/crossfade";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { LoadingTile } from "@/components/loading-tile";
import { SegmentedPages, TimeRangePills } from "@/components";
import { HomeDashboardCard } from "./home-dashboard-card";
import { InteractiveLineChartD3 } from "@/common/d3/interactive-line-chart";
import {
  RANGE_LABEL_KEYS,
  SeriesPoint,
  TimeRange,
  TIME_RANGES,
  filterBalanceSeriesByRange,
  seriesToChartArray,
} from "@/common/series-util";

const CHART_HEIGHT = 170;
// PagerView needs a bounded height, and every page is the same shape: the
// chart's header (value + change) plus the plot.
const PAGE_HEIGHT = 240;
/** Height the range pills add below the pager — the skeleton covers it too. */
const PILLS_HEIGHT = 40;
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
    marginEnd: 8,
  },
});

type AccountChartsCardProps = {
  currency: string;
  netWorthSeries: SeriesPoint[];
  assetsSeries: SeriesPoint[];
  liabilitiesSeries: SeriesPoint[];
  loading: boolean;
  error: boolean;
};

/**
 * Top-of-dashboard card whose tab strip switches between three balance-sheet
 * curves — net worth, assets, liabilities — over a shared time range. Same
 * three views (and the same signed liabilities) as the web dashboard's balance
 * sheet report. Tabs rather than swipe + dots: the charts own horizontal drags
 * for scrubbing, and the tab labels say what each page is where dots could not.
 */
export function AccountChartsCard({
  currency,
  netWorthSeries,
  assetsSeries,
  liabilitiesSeries,
  loading,
  error,
}: AccountChartsCardProps): JSX.Element {
  const { t } = useTranslations();
  const router = useRouter();
  const [range, setRange] = useState<TimeRange>("6M");
  // Tracked so a range change reports which curve the user was looking at.
  const [activeIndex, setActiveIndex] = useState(0);

  // One door for all three pages: the affordance lives on the card header, above
  // the tab strip, so it means the same thing whichever curve is showing. There
  // is no per-page destination to send it to — Accounts has no liabilities
  // filter route.
  // Hoisted so the skeleton and the loaded card cannot drift apart: they must
  // render the same header or the card changes height when the data lands.
  const tapThrough = {
    onSeeAll: () => router.navigate({ pathname: "/accounts" }),
    card: "accounts",
  } as const;

  if (loading || error) {
    return (
      // Same header as the loaded card: without it the card grows by a header
      // row when the data lands. Accounts is reachable whether or not this
      // card's series arrived, so the door is honest while loading.
      <HomeDashboardCard bleed {...tapThrough}>
        <View style={styles.skeletonTabs}>
          {TAB_TILE_WIDTHS.map((width) => (
            <LoadingTile key={width} width={width} style={styles.skeletonTab} />
          ))}
        </View>
        <LoadingTile height={PAGE_HEIGHT + PILLS_HEIGHT} mx={16} />
      </HomeDashboardCard>
    );
  }

  // Pages carry no title of their own — the tab above already names them.
  const charts = [
    { key: "netWorth", series: netWorthSeries },
    { key: "assets", series: assetsSeries },
    { key: "liabilities", series: liabilitiesSeries },
  ];
  const rangeOptions = TIME_RANGES.map((key) => ({
    key,
    label: t(RANGE_LABEL_KEYS[key]),
  }));

  const pages = charts.map(({ key, series }) => {
    const chart = seriesToChartArray(
      filterBalanceSeriesByRange(series, range),
      t("noDataCharts"),
    );
    return (
      <InteractiveLineChartD3
        key={key}
        labels={chart.labels}
        numbers={chart.numbers}
        currency={currency}
        height={CHART_HEIGHT}
      />
    );
  });

  return (
    <HomeDashboardCard bleed {...tapThrough}>
      {/* Crossfades in over the skeleton, which is sized to this same block. */}
      <FadeInView>
        <SegmentedPages
          tabs={charts.map(({ key }) => t(key))}
          pages={pages}
          height={PAGE_HEIGHT}
          onPageChange={(index) => {
            setActiveIndex(index);
            analytics.track("home_chart_page", {
              index,
              chart: charts[index].key,
            });
          }}
        />
        {/* Outside the pager: one row of pills driving whichever curve is
            shown, so switching tabs keeps the selected range. */}
        <TimeRangePills
          value={range}
          options={rangeOptions}
          onChange={(next) => {
            setRange(next);
            analytics.track("home_chart_range", {
              chart: charts[activeIndex].key,
              range: next,
            });
          }}
        />
      </FadeInView>
    </HomeDashboardCard>
  );
}
