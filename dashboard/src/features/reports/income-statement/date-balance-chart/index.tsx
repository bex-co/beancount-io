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
}: DateBalanceChartProps) {
  if (chartMode === "stacked") {
    return (
      <StackDateBalanceChart
        data={data}
        interval={interval}
        primarySeries={primarySeries}
        inverted={inverted}
      />
    );
  }

  return (
    <SingleDateBalanceChart
      data={data}
      interval={interval}
      primarySeries={primarySeries}
      inverted={inverted}
    />
  );
}
