import type { EChartsOption } from "echarts";
import type { ChartInterval } from "@/common/types/chart";
import {
  negateDecimalNumber,
  parseDecimalNumber,
} from "@/common/lib/beancount/decimal-number";
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

/** The table reads the source decimal with the chart's sign and zero-fill. */
export function periodBalanceText(
  balance: unknown,
  inverted?: boolean,
): string {
  const exact =
    typeof balance === "string" || typeof balance === "number"
      ? parseDecimalNumber(String(balance))
      : null;
  if (exact === null) return "0";
  return inverted ? negateDecimalNumber(exact) : exact;
}

/**
 * Shared helper to create empty data chart option
 */
export function createEmptyChartOption(): EChartsOption {
  return {
    series: [],
  };
}
