import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeInView } from "@/components/crossfade";
import { PressableScale } from "@/components/pressable-scale";
import { useTranslations } from "@/common/hooks/use-translations";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { directionalIcon } from "@/common/rtl";
import { InteractiveLineChartD3 } from "@/common/d3/interactive-line-chart";
import { DashboardCard } from "@/components/dashboard-card";
import { TimeRangePills } from "@/components/time-range-pills";
import { LoadingTile } from "@/components/loading-tile";
import { CardLoadFailure } from "@/components/card-load-failure";
import {
  RANGE_LABEL_KEYS,
  rangePillText,
  SeriesPoint,
  TIME_RANGES,
  TimeRange,
  balanceSeriesBaseline,
  filterBalanceSeriesByRange,
  seriesToChartArray,
} from "@/common/series-util";

const CHART_HEIGHT = 180;
/**
 * The chart's own header above the plot: caption, headline value and change
 * row. `AccountChartsCard` budgets 70 for the same header without a caption
 * (`PAGE_HEIGHT` 240 around a 170 plot); this card passes `label`, so it
 * carries one extra line.
 */
const HEADER_HEIGHT = 90;
/** Range pills below the plot, matching `AccountChartsCard`'s `PILLS_HEIGHT`. */
const PILLS_HEIGHT = 40;
/**
 * Skeleton height, derived rather than guessed — the previous flat 240 was
 * ~65px short of the loaded card, so every first load ended in a visible jump.
 */
const CARD_HEIGHT = HEADER_HEIGHT + CHART_HEIGHT + PILLS_HEIGHT;

type BalanceChartCardProps = {
  /** Small caption above the headline (e.g. "Net Worth", "Balance"). */
  label: string;
  /** Currency code (e.g. "USD", "MUSD") for the headline/change formatting. */
  currency: string;
  /** Headline/change formatter for a figure in commodity units. */
  formatValue?: (value: number, includePlus?: boolean) => string;
  /** Full monthly series (ascending); sliced client-side by the range pills. */
  series: SeriesPoint[];
  loading: boolean;
  /**
   * The first load failed and there is nothing to draw. A failed refresh over
   * a chart that is already loaded is not this: the caller keeps `error`
   * false and shows the stale banner (w21/239).
   */
  error?: boolean;
  /** Tries the first load again; offered with the failure. */
  onRetry?: () => void;
  /** Which way a change moves net worth; see `InteractiveLineChartD3`. */
  netWorthSign?: 1 | -1;
  /** A figure in units: no trend colour, no percent; see `InteractiveLineChartD3`. */
  neutral?: boolean;
  /**
   * Opens what `label` sums up, the holdings behind "1 not in total" (the
   * valuation sheet, w4/m27 rule 2): the caption is then a button, as Home's
   * is. Without it the count named holdings shown nowhere on the screen
   * (w21/742).
   */
  onLabelPress?: () => void;
};

// Home's caption (`AccountChartsCard`): the chart's own header type, its
// chevron trailing the last line of a wrapped status. It sits above the
// chart, outside the plot's swipe gesture, which covers the chart's header.
const styles = StyleSheet.create({
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

/**
 * Monarch-style balance header: a headline value with the change over the
 * selected range, an interactive line chart, and time-range pills. Used by the
 * account drill-down (account balance); range changes slice the passed series
 * client-side (no refetch).
 */
export function BalanceChartCard({
  label,
  currency,
  formatValue,
  series,
  loading,
  error,
  onRetry,
  netWorthSign,
  neutral,
  onLabelPress,
}: BalanceChartCardProps): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const [range, setRange] = useState<TimeRange>("6M");

  if (loading) {
    return (
      <DashboardCard bleed>
        <LoadingTile height={CARD_HEIGHT} mx={16} />
      </DashboardCard>
    );
  }
  // A failed first load says so and offers a retry; drawn as the skeleton it
  // looked like loading forever (w21/239).
  if (error) {
    return (
      <DashboardCard bleed>
        <CardLoadFailure onRetry={onRetry} />
      </DashboardCard>
    );
  }

  const chart = seriesToChartArray(
    filterBalanceSeriesByRange(series, range),
    t("noDataCharts"),
  );
  const rangeOptions = TIME_RANGES.map((key) => ({
    key,
    ...rangePillText(t, RANGE_LABEL_KEYS[key]),
  }));

  return (
    <DashboardCard bleed>
      <FadeInView>
        {onLabelPress && (
          <PressableScale
            style={styles.caption}
            onPress={onLabelPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={t("valuationDetailsHint")}
          >
            <Text style={[styles.captionText, { color: theme.black80 }]}>
              {label}
            </Text>
            <Ionicons
              name={directionalIcon("chevron-forward")}
              size={14}
              color={theme.black80}
              style={styles.captionChevron}
            />
          </PressableScale>
        )}
        <InteractiveLineChartD3
          label={onLabelPress ? undefined : label}
          a11yLabel={label}
          labels={chart.labels}
          periods={chart.periods}
          numbers={chart.numbers}
          baseline={balanceSeriesBaseline(series, range)}
          currency={currency}
          formatValue={formatValue}
          height={CHART_HEIGHT}
          netWorthSign={netWorthSign}
          neutral={neutral}
        />
      </FadeInView>
      <TimeRangePills
        value={range}
        options={rangeOptions}
        onChange={setRange}
      />
    </DashboardCard>
  );
}
