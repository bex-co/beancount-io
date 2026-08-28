import { useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeInView } from "@/components/crossfade";
import { PressableScale } from "@/components/pressable-scale";
import { useTranslations } from "@/common/hooks/use-translations";
import { LoadingTile } from "@/components/loading-tile";
import { DashboardCard, SegmentedPages, TimeRangePills } from "@/components";
import { InteractiveLineChartD3 } from "@/common/d3/interactive-line-chart";
import { fontSizes, fontWeights, space, useTheme } from "@/common/theme";
import { directionalIcon } from "@/common/rtl";
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
  skeletonTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  skeletonTabs: {
    flex: 1,
    flexDirection: "row",
  },
  skeletonTab: {
    height: 28,
    borderRadius: 14,
    marginEnd: 8,
  },
  seeAll: {
    // Match SegmentedPages tab padding so the label shares the tab row's
    // vertical center instead of sitting a few pixels higher.
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  seeAllText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    marginEnd: space.xxs,
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
  const theme = useTheme().colorTheme;
  const router = useRouter();
  const [range, setRange] = useState<TimeRange>("6M");

  // One door for all three pages: pinned to the tab row (not a lone header
  // above it), so it means the same thing whichever curve is showing. There
  // is no per-page destination — Accounts has no liabilities filter route.
  // Rendered here rather than in DashboardCard's header slot because the
  // affordance lives inside SegmentedPages.
  const seeAll = (
    <PressableScale
      style={styles.seeAll}
      onPress={() => router.navigate({ pathname: "/accounts" })}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t("seeAll")}
    >
      <Text style={[styles.seeAllText, { color: theme.primary }]}>
        {t("seeAll")}
      </Text>
      <Ionicons
        name={directionalIcon("chevron-forward")}
        size={16}
        color={theme.primary}
      />
    </PressableScale>
  );

  if (loading || error) {
    return (
      // Same tab-row + see-all as the loaded card: without both the card
      // grows when the data lands. Accounts is reachable whether or not this
      // card's series arrived, so the door is honest while loading.
      <DashboardCard bleed>
        <View style={styles.skeletonTabsRow}>
          <View style={styles.skeletonTabs}>
            {TAB_TILE_WIDTHS.map((width) => (
              <LoadingTile
                key={width}
                width={width}
                style={styles.skeletonTab}
              />
            ))}
          </View>
          {seeAll}
        </View>
        <LoadingTile height={PAGE_HEIGHT + PILLS_HEIGHT} mx={16} />
      </DashboardCard>
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
    <DashboardCard bleed>
      {/* Crossfades in over the skeleton, which is sized to this same block. */}
      <FadeInView>
        <SegmentedPages
          tabs={charts.map(({ key }) => t(key))}
          pages={pages}
          height={PAGE_HEIGHT}
          trailing={seeAll}
        />
        {/* Outside the pager: one row of pills driving whichever curve is
            shown, so switching tabs keeps the selected range. */}
        <TimeRangePills
          value={range}
          options={rangeOptions}
          onChange={setRange}
        />
      </FadeInView>
    </DashboardCard>
  );
}
