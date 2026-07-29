import { ReactECharts } from "@/common/components/react-echarts";
import type { ChartConfig } from "../lib/chart-utils";

interface QueryResultChartProps {
  chartConfig: ChartConfig;
}

export function QueryResultChart({ chartConfig }: QueryResultChartProps) {
  return (
    <div className="w-full" style={{ maxHeight: "400px" }}>
      <ReactECharts
        option={chartConfig.option}
        style={{ height: "400px", width: "100%" }}
      />
    </div>
  );
}
