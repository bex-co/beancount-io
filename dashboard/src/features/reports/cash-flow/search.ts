import { createViewSearchSchema } from "@/common/lib/navigation/view-search";

/** The report's chart tabs, in tab order. */
export const CASH_FLOW_VIEWS = ["netCashFlow", "byActivity"] as const;

export type CashFlowViewsView = (typeof CASH_FLOW_VIEWS)[number];

export const DEFAULT_VIEW: CashFlowViewsView = "netCashFlow";

/**
 * The selected chart lives in the URL so it survives the ledger layout
 * replacing its Outlet on a shared account/filter/time change.
 */
export const viewSearchSchema = createViewSearchSchema(
  CASH_FLOW_VIEWS,
  DEFAULT_VIEW,
);
