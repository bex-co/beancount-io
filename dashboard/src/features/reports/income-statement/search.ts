import { createViewSearchSchema } from "@/common/lib/navigation/view-search";

/** The report's chart tabs, in tab order. */
export const INCOME_STATEMENT_VIEWS = [
  "netProfit",
  "income",
  "incomeBreakdown",
  "expenses",
  "expensesBreakdown",
] as const;

export type IncomeStatementViewsView = (typeof INCOME_STATEMENT_VIEWS)[number];

export const DEFAULT_VIEW: IncomeStatementViewsView = "netProfit";

/**
 * The selected chart lives in the URL so it survives the ledger layout
 * replacing its Outlet on a shared account/filter/time change.
 */
export const viewSearchSchema = createViewSearchSchema(
  INCOME_STATEMENT_VIEWS,
  DEFAULT_VIEW,
);
