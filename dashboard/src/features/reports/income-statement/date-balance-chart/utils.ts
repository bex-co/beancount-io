import type { EChartsOption } from "echarts";
import type { ChartInterval } from "@/common/types/chart";
import { formatDateAxis, formatYAxisNumber } from "@/common/lib/chart/chart";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";

export interface DateAndBalance {
  date: string;
  balance: Record<string, unknown>;
  accountBalances?: Record<string, unknown>;
}

export interface DateBalanceChartProps {
  data: DateAndBalance[];
  interval?: ChartInterval;
  primarySeries?: string;
  chartMode?: "stacked" | "single";
  inverted?: boolean;
}

export interface BaseChartProps {
  data: DateAndBalance[];
  interval?: ChartInterval;
  primarySeries?: string;
  inverted?: boolean;
}

/**
 * Shared helper to create common chart axis configuration
 */
export function createCommonAxisConfig(
  dates: string[],
  interval?: ChartInterval,
): {
  xAxis: EChartsOption["xAxis"];
  yAxis: EChartsOption["yAxis"];
} {
  return {
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: {
        formatter: (value: string) => {
          return formatDateAxis(value, interval ?? "monthly");
        },
      },
      axisLine: {
        lineStyle: {
          color: "rgba(128, 128, 128, 0.2)",
          width: 1,
          type: "solid",
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => {
          return formatYAxisNumber(value);
        },
        fontSize: 12,
      },
      axisLine: {
        lineStyle: {
          color: "rgba(128, 128, 128, 0.2)",
          width: 1,
          type: "solid",
        },
      },
      splitLine: defaultSplitLine,
    },
  };
}

/**
 * Shared helper to create common chart grid configuration
 */
export function createCommonGridConfig(): EChartsOption["grid"] {
  return {
    left: "0%",
    right: "0%",
    bottom: "25px",
    top: "3%",
    containLabel: true,
  };
}

/**
 * Shared helper to create empty data chart option
 */
export function createEmptyChartOption(): EChartsOption {
  return {
    series: [],
  };
}
