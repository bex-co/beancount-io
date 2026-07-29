import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import type {
  EChartsOption,
  BarSeriesOption,
  TooltipComponentFormatterCallback,
  TooltipComponentFormatterCallbackParams,
  TooltipComponentOption,
} from "echarts";
import { sortUsdFirst } from "@/common/lib/utils/sort";
import { getChartColors } from "@/common/lib/chart/color";
import {
  type BaseChartProps,
  createCommonAxisConfig,
  createCommonGridConfig,
  createEmptyChartOption,
} from "./utils";
import { formatDateAxis } from "@/common/lib/chart/chart";
/**
 * Single Date Balance Chart component
 * Displays data as a bar chart with multiple commodities shown separately
 */
export function SingleDateBalanceChart({
  data,
  interval,
  primarySeries = "USD",
  inverted,
}: BaseChartProps) {
  const formatNum = useFormatNumber();
  const chartOption = useMemo((): EChartsOption => {
    if (!data || data.length === 0) {
      return createEmptyChartOption();
    }

    // Extract all unique commodities from the data
    const commodities = new Set<string>();
    data.forEach((item) => {
      Object.keys(item.balance).forEach((commodity) => {
        commodities.add(commodity);
      });
    });

    const commodityList = sortUsdFirst(Array.from(commodities), primarySeries);

    // Prepare data for each commodity
    const seriesData: BarSeriesOption[] = commodityList.map((commodity) => {
      const values = data.map((item) => {
        const balance = item.balance[commodity];
        if (balance === null || balance === undefined) {
          return 0;
        }
        // Convert to number, handling both string and number types
        const numericValue =
          typeof balance === "string" ? parseFloat(balance) : Number(balance);
        return isNaN(numericValue)
          ? 0
          : inverted
            ? -numericValue
            : numericValue;
      });

      return {
        name: commodity,
        type: "bar",
        data: values,
        emphasis: {
          focus: "series",
        },
      };
    });

    // Prepare x-axis data (dates)
    const dates = data.map((item) => item.date);

    const tooltip: TooltipComponentOption = {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: ((params: TooltipComponentFormatterCallbackParams) => {
        if (Array.isArray(params)) {
          let result = `<div><strong>${formatDateAxis(params[0].name, interval ?? "monthly")}</strong></div>`;
          params.forEach((param) => {
            const value = param.value;

            const formattedValue =
              typeof value === "number"
                ? value >= 0
                  ? `+${formatNum(value)}`
                  : formatNum(value)
                : "0";
            result += `<div style="color: ${param.color}">
              <span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>
              ${param.seriesName}: <span style="color: ${param.color}; font-weight: bold;">${formattedValue}</span>
            </div>`;
          });
          return result;
        }
        return "";
      }) as TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>,
    };

    const legendSelected: Record<string, boolean> = (() => {
      const selected: Record<string, boolean> = {};
      commodityList.forEach((commodity) => {
        selected[commodity] = commodity === primarySeries;
      });
      // if commodity is not USD; select first one
      if (!selected[primarySeries] && commodityList.length > 0) {
        selected[commodityList[0]] = true;
      }
      return selected;
    })();

    const { xAxis, yAxis } = createCommonAxisConfig(dates, interval);

    return {
      tooltip,
      legend: {
        data: commodityList,
        bottom: 0,
        type: "scroll",
        pageButtonItemGap: 5,
        selected: legendSelected,
      },
      grid: createCommonGridConfig(),
      xAxis,
      yAxis,
      series: seriesData,
      color: getChartColors(),
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [data, interval, primarySeries, inverted, formatNum]);

  return (
    <div className="w-full">
      <ReactECharts
        option={chartOption}
        style={{ height: "250px", width: "100%" }}
        className="w-full"
      />
    </div>
  );
}
