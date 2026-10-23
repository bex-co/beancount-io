import { useMemo, useState } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import type {
  EChartsOption,
  LegendComponentOption,
  TooltipComponentFormatterCallback,
  TooltipComponentFormatterCallbackParams,
} from "echarts";
import type { DateAndBalance } from "@/graphql/definitions";
import { sortUsdFirst } from "@/common/lib/utils/sort";
import { getChartColors } from "@/common/lib/chart/color";
import type { ChartInterval } from "@/common/types/chart";
import { formatYAxisNumber, formatDateAxis } from "@/common/lib/chart/chart";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";
import {
  ChartPeriodTable,
  type ChartPeriodSeries,
} from "../components/chart-period-table";
import {
  legendSelectionFor,
  type LegendSelection,
} from "../lib/legend-selection";

interface LineChartProps {
  data: DateAndBalance[];
  className?: string;
  interval?: ChartInterval;
  primarySeries?: string;
  inverted?: boolean;
  labelledBy?: string;
  /**
   * The units the reader chose in the legend, held by a caller that outlives
   * this chart (a report whose pending read unmounts it). Without one, the
   * chart keeps the choice itself across its own data updates (w4/m51).
   */
  legendSelection?: LegendSelection;
  onLegendSelectionChange?: (selected: LegendSelection) => void;
}

const styles = { height: "250px", width: "100%" };

/**
 * Net Worth Line Chart Component
 * Displays net worth data as a line chart with legend controls
 */
export function LineChart({
  data,
  className,
  interval,
  primarySeries = "USD",
  inverted,
  labelledBy,
  legendSelection,
  onLegendSelectionChange,
}: LineChartProps) {
  const formatNum = useFormatNumber();
  const [ownSelection, setOwnSelection] = useState<LegendSelection>();
  const chosen = onLegendSelectionChange ? legendSelection : ownSelection;
  const choose = onLegendSelectionChange ?? setOwnSelection;
  const built = useMemo((): {
    chartOption: EChartsOption;
    periodSeries: ChartPeriodSeries[];
    commodities: string[];
  } => {
    if (!data || data.length === 0) {
      return {
        chartOption: { series: [] },
        periodSeries: [],
        commodities: [],
      };
    }

    const allCommodities = new Set<string>();
    data.forEach((item) => {
      Object.keys(item.balance).forEach((key) => allCommodities.add(key));
    });

    const commodities = sortUsdFirst(Array.from(allCommodities), primarySeries);

    const series = commodities.map((commodity) => ({
      name: commodity,
      type: "line" as const,
      data: data.map((item) => {
        const value = parseFloat((item.balance[commodity] as string) || "0");
        return [item.date, inverted ? -value : value] as [string, number];
      }),
      step: "end" as const,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        width: 2,
      },
    }));

    // Prepare x-axis data (dates)
    const dates = data.map((item) => item.date);

    // The plotted points are numbers, so the tooltip can no longer see how
    // much precision the ledger actually sent. Remember it per point.
    const sourceDigits = new Map<string, number>();
    data.forEach((item) => {
      Object.entries(item.balance).forEach(([commodity, raw]) => {
        sourceDigits.set(
          `${item.date}\u0000${commodity}`,
          fractionDigitsOf(raw as string),
        );
      });
    });

    return {
      commodities,
      periodSeries: series.map((item) => ({
        unit: item.name,
        values: item.data.map((point) => point[1]),
      })),
      chartOption: {
        tooltip: {
          ...CONFINED_TOOLTIP,
          trigger: "axis",
          axisPointer: {
            type: "cross",
            snap: true,
          },
          formatter: ((params: TooltipComponentFormatterCallbackParams) => {
            if (Array.isArray(params)) {
              // For axis tooltips, the axis value is typically the name of the first param
              const date = formatDateAxis(
                params[0].name,
                interval ?? "monthly",
              );
              let tooltip = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`;
              params.forEach((param) => {
                if (
                  param.value &&
                  Array.isArray(param.value) &&
                  param.value[1] !== 0
                ) {
                  const value = param.value[1] as number;
                  const digits =
                    sourceDigits.get(
                      `${param.name}\u0000${param.seriesName}`,
                    ) ?? 0;
                  tooltip += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color || "#000"}; margin-right: 8px; border-radius: 50%;"></span>
                  ${param.seriesName || "Unknown"}: ${formatNum(value, param.seriesName, digits)}
                </div>`;
                }
              });
              return tooltip;
            }
            return "";
          }) as TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>,
        },
        legend: {
          data: commodities,
          bottom: 0,
          type: "scroll",
          pageButtonItemGap: 5,
        },
        grid: {
          left: "0%",
          right: "0",
          bottom: "25",
          top: "3%",
          containLabel: true,
        },
        color: getChartColors(),
        xAxis: {
          type: "category",
          data: dates,
          axisLabel: {
            formatter: (value: string) => {
              return formatDateAxis(value, interval ?? "monthly");
            },
          },
          axisPointer: {
            snap: true,
          },
        },
        yAxis: {
          type: "value",
          splitLine: defaultSplitLine,
          axisLabel: {
            formatter: (value: number) => {
              return formatYAxisNumber(value);
            },
          },
          axisPointer: {
            snap: true,
          },
          min: ({ min }) => (min > 0 ? min * 0.8 : min * 1.1),
          max: ({ max }) => (max > 0 ? max * 1.1 : max * 0.9),
        },
        series,
        animation: true,
        animationDuration: 1000,
        animationEasing: "cubicOut",
      },
    };
  }, [data, interval, primarySeries, inverted, formatNum]);

  // The reader's legend choice survives a regrouped period or other data
  // update; ECharts would otherwise take the new option's defaults. A click is
  // already on screen, so it is stored without a new option: only new data,
  // or a remount, folds the choice in (w4/m51).
  const [applied, setApplied] = useState({ built, chosen });
  if (applied.built !== built) setApplied({ built, chosen });
  const chartOption = useMemo((): EChartsOption => {
    const { chartOption: base, commodities } = applied.built;
    if (commodities.length === 0) return base;
    return {
      ...base,
      legend: {
        ...(base.legend as LegendComponentOption),
        selected: legendSelectionFor(
          commodities,
          primarySeries,
          applied.chosen,
        ),
      },
    };
  }, [applied, primarySeries]);

  return (
    <div className={className}>
      <ReactECharts
        option={chartOption}
        style={styles}
        onLegendSelectChanged={choose}
      />
      {labelledBy && (
        <ChartPeriodTable
          data={data}
          series={built.periodSeries}
          labelledBy={labelledBy}
        />
      )}
    </div>
  );
}
