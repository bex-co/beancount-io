import type { DateBalanceChartProps } from "./utils";
import { StackDateBalanceChart } from "./stack-date-balance-chart";
import { SingleDateBalanceChart } from "./single-date-balance-chart";

/**
 * Net Profit Chart component
 * Displays net profit data as a bar chart with multiple commodities
 */
export function DateBalanceChart({
  data,
  interval,
  primarySeries = "USD",
  chartMode = "single",
  inverted,
  labelledBy,
  legendSelection,
  onLegendSelectionChange,
}: DateBalanceChartProps) {
  const Chart =
    chartMode === "stacked" ? StackDateBalanceChart : SingleDateBalanceChart;
  return (
    <Chart
      data={data}
      interval={interval}
      primarySeries={primarySeries}
      inverted={inverted}
      labelledBy={labelledBy}
      legendSelection={legendSelection}
      onLegendSelectionChange={onLegendSelectionChange}
    />
  );
}
