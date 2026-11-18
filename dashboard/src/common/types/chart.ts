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

/**
 * A report conversion: a presentation mode, or a currency code to convert to.
 * Any commodity code is a valid target — the balance reads convert to whatever
 * currency they are asked for — so ledgers with several operating currencies
 * can offer every one of them, not just a single hard-coded code.
 */
export type ConversionOption = "at_cost" | "at_value" | "units" | (string & {});
