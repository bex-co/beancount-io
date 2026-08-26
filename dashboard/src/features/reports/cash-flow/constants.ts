import type { ChartInterval, ConversionOption } from "@/common/types/chart";

export const cashFlowQueryDefaults: {
  interval: ChartInterval;
  conversion: ConversionOption;
} = {
  interval: "monthly",
  conversion: "at_cost",
};
