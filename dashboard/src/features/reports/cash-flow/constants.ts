import type { ChartInterval, ConversionOption } from "@/common/types/chart";

export const cashFlowQueryDefaults: {
  interval: ChartInterval;
  conversion: ConversionOption;
} = {
  interval: "monthly",
  conversion: "at_cost",
};

/** beancount.io docs page on declaring `cash-flow-role` on `open` directives. */
export const CASH_FLOW_ROLES_DOC_PATH = "cash-flow-roles";
