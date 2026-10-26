/** Every interval a report can group by, in selector order. */
export const CHART_INTERVALS = [
  "yearly",
  "quarterly",
  "monthly",
  "weekly",
  "daily",
] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number];

export const DEFAULT_CHART_INTERVAL: ChartInterval = "monthly";

export type ConversionOption = "at_cost" | "at_value" | "units" | "USD";
