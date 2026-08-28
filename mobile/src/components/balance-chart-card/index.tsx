import { useState } from "react";
import { FadeInView } from "@/components/crossfade";
import { useTranslations } from "@/common/hooks/use-translations";
import { InteractiveLineChartD3 } from "@/common/d3/interactive-line-chart";
import { DashboardCard } from "@/components/dashboard-card";
import { TimeRangePills } from "@/components/time-range-pills";
import { LoadingTile } from "@/components/loading-tile";
import {
  RANGE_LABEL_KEYS,
  SeriesPoint,
  TIME_RANGES,
  TimeRange,
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
  /** Full monthly series (ascending); sliced client-side by the range pills. */
  series: SeriesPoint[];
  loading: boolean;
  error?: boolean;
};

/**
 * Monarch-style balance header: a headline value with the change over the
 * selected range, an interactive line chart, and time-range pills. Used by the
 * account drill-down (account balance); range changes slice the passed series
 * client-side (no refetch).
 */
export function BalanceChartCard({
  label,
  currency,
  series,
  loading,
  error,
}: BalanceChartCardProps): JSX.Element {
  const { t } = useTranslations();
  const [range, setRange] = useState<TimeRange>("6M");

  if (loading || error) {
    return (
      <DashboardCard bleed>
        <LoadingTile height={CARD_HEIGHT} mx={16} />
      </DashboardCard>
    );
  }

  const chart = seriesToChartArray(
    filterBalanceSeriesByRange(series, range),
    t("noDataCharts"),
  );
  const rangeOptions = TIME_RANGES.map((key) => ({
    key,
    label: t(RANGE_LABEL_KEYS[key]),
  }));

  return (
    <DashboardCard bleed>
      <FadeInView>
        <InteractiveLineChartD3
          label={label}
          labels={chart.labels}
          numbers={chart.numbers}
          currency={currency}
          height={CHART_HEIGHT}
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
