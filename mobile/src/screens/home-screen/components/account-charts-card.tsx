import { useCallback, useState } from "react";
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
  balanceSeriesBaseline,
  filterBalanceSeriesByRange,
  seriesToChartArray,
} from "@/common/series-util";
import { chartPageHeight } from "./chart-page-height";
import { useGuest } from "@/common/guest/guest-context";

/** The card's three pages, each named by its tab's translation key. */
export type ChartKey = "netWorth" | "assets" | "liabilities";

const CHART_HEIGHT = 170;
// PagerView needs a bounded height, and every page is the same shape: the
// chart's header (value + change, and Net Worth's cost basis) plus the plot.
// The status line sits above the pager, not in it (see `header` below). This is
// the floor and the pre-measurement default — the header is text-driven, so
// the live height comes from `chartPageHeight` once a page reports its
// header's layout.
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
  // Same inset and type as the chart's own header, which it sits directly
  // above; the chevron trails the last line of a wrapped status.
  caption: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  captionText: {
    flexShrink: 1,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
  },
  captionChevron: {
    marginStart: 2,
    marginBottom: 2,
  },
});

type AccountChartsCardProps = {
  currency: string;
  netWorthSeries: SeriesPoint[];
  assetsSeries: SeriesPoint[];
  liabilitiesSeries: SeriesPoint[];
  /**
   * Status line above each page's figure: its basis, plus how many prices are
   * behind and how many holdings sit at cost or outside the total. Absent for
   * a page whose total values no holding.
   */
  captions: Record<ChartKey, string | undefined>;
  /** Line under a page's figure: its cost basis beside the market value. */
  footnotes: Partial<Record<ChartKey, string>>;
  /** Opens the holdings behind a page's status line. */
  onCaptionPress: (key: ChartKey) => void;
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
  captions,
  footnotes,
  onCaptionPress,
  loading,
  error,
}: AccountChartsCardProps): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const router = useRouter();
  const guest = useGuest();
  const [range, setRange] = useState<TimeRange>("6M");
  // Tallest status line any page has shown, so switching tabs never moves the
  // pager: the line sits above it, outside the measured page header.
  const [captionHeight, setCaptionHeight] = useState(0);
  // Tallest header any page has reported. Max, not last: the three pages carry
  // different amounts and only one is measured at a time, so the pager has to be
  // tall enough for whichever is showing.
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const handleHeaderLayout = useCallback((height: number) => {
    setHeaderHeight((previous) =>
      previous === null || height > previous ? height : previous,
    );
  }, []);
  const pageHeight = chartPageHeight(headerHeight, CHART_HEIGHT, PAGE_HEIGHT);

  // One door for all three pages: pinned to the tab row (not a lone header
  // above it), so it means the same thing whichever curve is showing. There
  // is no per-page destination — Accounts has no liabilities filter route.
  // Rendered here rather than in DashboardCard's header slot because the
  // affordance lives inside SegmentedPages.
  const seeAll = (
    <PressableScale
      style={styles.seeAll}
      onPress={() =>
        guest
          ? guest.navigate("accounts")
          : router.navigate({ pathname: "/accounts" })
      }
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

  // Pages carry no title of their own — the tab above already names them. The
  // caption says instead what the figure is: its basis and any omissions.
  const charts: { key: ChartKey; series: SeriesPoint[] }[] = [
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
        footnote={footnotes[key]}
        labels={chart.labels}
        numbers={chart.numbers}
        baseline={balanceSeriesBaseline(series, range)}
        currency={currency}
        height={CHART_HEIGHT}
        onHeaderLayout={handleHeaderLayout}
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
          height={pageHeight}
          trailing={seeAll}
          header={(activeIndex) => (
            <View style={{ minHeight: captionHeight }}>
              {captions[charts[activeIndex].key] !== undefined && (
                <PressableScale
                  style={styles.caption}
                  onPress={() => onCaptionPress(charts[activeIndex].key)}
                  accessibilityRole="button"
                  accessibilityLabel={captions[charts[activeIndex].key]}
                  accessibilityHint={t("valuationDetailsHint")}
                  onLayout={(event) => {
                    const height = event.nativeEvent.layout.height;
                    setCaptionHeight((previous) => Math.max(previous, height));
                  }}
                >
                  <Text style={[styles.captionText, { color: theme.black80 }]}>
                    {captions[charts[activeIndex].key]}
                  </Text>
                  <Ionicons
                    name={directionalIcon("chevron-forward")}
                    size={14}
                    color={theme.black80}
                    style={styles.captionChevron}
                  />
                </PressableScale>
              )}
            </View>
          )}
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
