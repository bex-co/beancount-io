import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import type {
  EChartsOption,
  TooltipComponentFormatterCallback,
  TooltipComponentFormatterCallbackParams,
} from "echarts";
import type { DateAndBalance } from "@/graphql/definitions";
import { sortUsdFirst } from "@/common/lib/utils/sort";
import { getChartColors } from "@/common/lib/chart/color";
import type { ChartInterval } from "@/common/types/chart";
import { formatYAxisNumber, formatDateAxis } from "@/common/lib/chart/chart";

interface LineChartProps {
  data: DateAndBalance[];
  className?: string;
  interval?: ChartInterval;
  primarySeries?: string;
  inverted?: boolean;
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
}: LineChartProps) {
  const formatNum = useFormatNumber();
  const chartOption = useMemo((): EChartsOption => {
    if (!data || data.length === 0) {
      return {
        title: {
          text: "No Data Available",
          left: "center",
          top: "middle",
          textStyle: {
            color: "var(--muted-foreground)",
            fontSize: 16,
          },
        },
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
        return [item.date, inverted ? -value : value];
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

    const legendSelected: Record<string, boolean> = (() => {
      const selected: Record<string, boolean> = {};
      commodities.forEach((commodity) => {
        selected[commodity] = commodity === primarySeries;
      });
      // if commodity is not USD; select first one
      if (!selected[primarySeries] && commodities.length > 0) {
        selected[commodities[0]] = true;
      }
      return selected;
    })();

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          snap: true,
        },
        formatter: ((params: TooltipComponentFormatterCallbackParams) => {
          if (Array.isArray(params)) {
            // For axis tooltips, the axis value is typically the name of the first param
            const date = formatDateAxis(params[0].name, interval ?? "monthly");
            let tooltip = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`;
            params.forEach((param) => {
              if (
                param.value &&
                Array.isArray(param.value) &&
                param.value[1] !== 0
              ) {
                const value = param.value[1] as number;
                tooltip += `<div style="margin: 4px 0;">
                  <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color || "#000"}; margin-right: 8px; border-radius: 50%;"></span>
                  ${param.seriesName || "Unknown"}: ${formatNum(value)}
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
        selected: legendSelected,
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
    };
  }, [data, interval, primarySeries, inverted, formatNum]);

  return (
    <div className={className}>
      <ReactECharts option={chartOption} style={styles} />
    </div>
  );
}
