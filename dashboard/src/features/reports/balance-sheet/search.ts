import { createViewSearchSchema } from "@/common/lib/navigation/view-search";

/** The report's chart tabs, in tab order. */
export const BALANCE_SHEET_VIEWS = [
  "netWorth",
  "assets",
  "assetsBreakdown",
  "liabilities",
  "liabilitiesBreakdown",
  "equity",
  "equityBreakdown",
] as const;

export type BalanceSheetViewsView = (typeof BALANCE_SHEET_VIEWS)[number];

export const DEFAULT_VIEW: BalanceSheetViewsView = "netWorth";

/**
 * The selected chart and grouping interval live in the URL so they survive
 * the ledger layout replacing its Outlet on a shared account/filter/time
 * change (w4/m57). Unknown values become the defaults, which leave the URL
 * clean.
 */
export const viewSearchSchema = createViewSearchSchema(BALANCE_SHEET_VIEWS, {
  interval: true,
});
