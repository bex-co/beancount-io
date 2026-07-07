import { useState } from "react";
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
  filterSeriesByRange,
  seriesToChartArray,
} from "@/common/series-util";

const CARD_HEIGHT = 240;
const CHART_HEIGHT = 180;

type BalanceChartCardProps = {
  /** Small caption above the headline (e.g. "Net Worth", "Balance"). */
  label: string;
  currencySymbol: string;
  /** Full monthly series (ascending); sliced client-side by the range pills. */
  series: SeriesPoint[];
  loading: boolean;
  error?: boolean;
  /** Notified when the user picks a range (for analytics); slicing is internal. */
  onRangeChange?: (range: TimeRange) => void;
};

/**
 * Monarch-style balance header: a headline value with the change over the
 * selected range, an interactive line chart, and time-range pills. Shared by
 * the Accounts tab (net worth) and the account drill-down (account balance);
 * range changes slice the passed series client-side (no refetch).
 */
export function BalanceChartCard({
  label,
  currencySymbol,
  series,
  loading,
  error,
  onRangeChange,
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
    filterSeriesByRange(series, range),
    t("noDataCharts"),
  );
  const rangeOptions = TIME_RANGES.map((key) => ({
    key,
    label: t(RANGE_LABEL_KEYS[key]),
  }));

  return (
    <DashboardCard bleed>
      <InteractiveLineChartD3
        label={label}
        labels={chart.labels}
        numbers={chart.numbers}
        currencySymbol={currencySymbol}
        height={CHART_HEIGHT}
      />
      <TimeRangePills
        value={range}
        options={rangeOptions}
        onChange={(next) => {
          setRange(next);
          onRangeChange?.(next);
        }}
      />
    </DashboardCard>
  );
}
