import type { ChartInterval, ConversionOption } from "@/common/types/chart";

export const accountQueryDefaults: {
  interval: ChartInterval;
  conversion: ConversionOption;
} = {
  interval: "monthly",
  conversion: "at_cost",
};
