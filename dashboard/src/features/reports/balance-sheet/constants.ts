import type { ChartInterval, ConversionOption } from "@/common/types/chart";

export const balanceSheetQueryDefaults: {
  interval: ChartInterval;
  conversion: ConversionOption;
} = {
  interval: "monthly",
  conversion: "at_cost",
};
