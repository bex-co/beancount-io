import type { EChartsOption } from "echarts";
import type { ChartInterval } from "@/common/types/chart";
import type { LegendSelectionProps } from "../../lib/legend-selection";

export interface DateAndBalance {
  date: string;
  balance: Record<string, unknown>;
  accountBalances?: Record<string, unknown>;
}

export interface DateBalanceChartProps extends LegendSelectionProps {
  data: DateAndBalance[];
  interval?: ChartInterval;
  primarySeries?: string;
  chartMode?: "stacked" | "single";
  inverted?: boolean;
  labelledBy?: string;
}

export interface BaseChartProps extends LegendSelectionProps {
  data: DateAndBalance[];
  interval?: ChartInterval;
  primarySeries?: string;
  inverted?: boolean;
  labelledBy?: string;
}

/**
 * Shared helper to create empty data chart option
 */
export function createEmptyChartOption(): EChartsOption {
  return {
    series: [],
  };
}
