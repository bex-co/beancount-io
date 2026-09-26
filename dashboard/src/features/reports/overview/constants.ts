import type { ChartInterval, ConversionOption } from "@/common/types/chart";

/**
 * `conversion` values the flow modules (Money movement, Income vs Expenses,
 * Cash flow) at cost, as the Income Statement does. The balance modules read
 * `GetLedgerOverviewValuation` instead, which values holdings at market.
 */
export const overviewQueryDefaults: {
  interval: ChartInterval;
  conversion: ConversionOption;
} = {
  interval: "monthly",
  conversion: "at_cost",
};
