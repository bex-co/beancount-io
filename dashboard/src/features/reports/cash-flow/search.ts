import { createViewSearchSchema } from "@/common/lib/navigation/view-search";

/** The report's chart tabs, in tab order. */
export const CASH_FLOW_VIEWS = ["netCashFlow", "byActivity"] as const;

export type CashFlowViewsView = (typeof CASH_FLOW_VIEWS)[number];

export const DEFAULT_VIEW: CashFlowViewsView = "netCashFlow";

/**
 * The selected chart and grouping interval live in the URL so they survive
 * the ledger layout replacing its Outlet on a shared account/filter/time
 * change (w4/m57). Unknown values become the defaults, which leave the URL
 * clean.
 */
export const viewSearchSchema = createViewSearchSchema(CASH_FLOW_VIEWS, {
  interval: true,
});
