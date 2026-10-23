import { z } from "zod";
import { isOneOfViews } from "@/common/lib/navigation/view-search";

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

/** Income and Expenses draw stacked by account, or one bar per unit. */
export const CHART_MODES = ["stacked", "single"] as const;

export const DEFAULT_CHART_MODE: (typeof CHART_MODES)[number] = "stacked";

/**
 * The selected chart and its bar mode live in the URL so they survive the
 * ledger layout replacing its Outlet on a shared account/filter/time change
 * (w4/998). Unknown values become the defaults, which leave the URL clean.
 */
export const incomeStatementSearchSchema = z
  .object({ view: z.unknown().optional(), mode: z.unknown().optional() })
  .transform(
    ({
      view,
      mode,
    }): {
      view?: IncomeStatementViewsView;
      mode?: (typeof CHART_MODES)[number];
    } => ({
      view: isOneOfViews(INCOME_STATEMENT_VIEWS, view) ? view : undefined,
      mode: isOneOfViews(CHART_MODES, mode) ? mode : undefined,
    }),
  );
