import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const enOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "In progress",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Flows",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Net worth by month",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Month",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.en,
  ...emptyLedgerOverviewTranslations.en,
  "page.overview.loading": {
    message: "Loading overview data…",
    description: "Loading message for overview data",
  },
  "page.overview.failedToLoad": {
    message:
      "Failed to load ledger overview information. Please try again later.",
    description: "Error description for overview page",
  },
  "page.overview.cashFlow": {
    message: "Cash Flow",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Loading account roles…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "To cash",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "From cash",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "Amounts are shown in {unit}. Balances in {others} are not included.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "Star",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Starred",
    description: "Button label indicating the ledger is starred",
  },
};

export default enOverview;
