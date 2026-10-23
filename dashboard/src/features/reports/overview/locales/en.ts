import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const enOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "Breakdown",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "Flows",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "Share of total",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "Share of absolute total",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
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
  "page.overview.assetsDistribution": {
    message: "Assets Distribution",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Visual representation of {ledgerName} assets composition",
    description: "Description for assets distribution chart",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Liabilities Distribution",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Visual representation of {ledgerName} liabilities composition",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Cash Flow",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Money flow from income sources to expenses and investments",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Loading account roles…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "Savings",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "Shortfall",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
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
