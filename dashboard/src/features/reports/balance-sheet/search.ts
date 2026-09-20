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
 * The selected chart lives in the URL so it survives the ledger layout
 * replacing its Outlet on a shared account/filter/time change.
 */
export const viewSearchSchema = createViewSearchSchema(
  BALANCE_SHEET_VIEWS,
  DEFAULT_VIEW,
);
