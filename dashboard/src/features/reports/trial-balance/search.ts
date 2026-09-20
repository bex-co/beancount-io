import { createViewSearchSchema } from "@/common/lib/navigation/view-search";

/** The report's chart tabs, in tab order. */
export const TRIAL_BALANCE_VIEWS = [
  "assets",
  "liabilities",
  "income",
  "expenses",
  "equity",
] as const;

export type TrialBalanceViewsView = (typeof TRIAL_BALANCE_VIEWS)[number];

export const DEFAULT_VIEW: TrialBalanceViewsView = "assets";

/**
 * The selected chart lives in the URL so it survives the ledger layout
 * replacing its Outlet on a shared account/filter/time change.
 */
export const viewSearchSchema = createViewSearchSchema(
  TRIAL_BALANCE_VIEWS,
  DEFAULT_VIEW,
);
