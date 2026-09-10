import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const enOverview: Record<string, TranslationEntry> = {
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
  "page.overview.cashFlowToCash": {
    message: "To cash & equivalents",
    description:
      "Sankey node label for the period's net increase in cash and cash equivalents",
  },
  "page.overview.cashFlowFromCash": {
    message: "From cash & equivalents",
    description:
      "Sankey node label for the period's net decrease in cash and cash equivalents",
  },
  "page.overview.cashFlowUnshownUnits": {
    message:
      "Shown in {currency}. {units} have no price to {currency}, so they're not in the chart.",
    description:
      "Caption under the cash flow chart listing units that could not be converted to the presentation currency",
  },
  "page.overview.cashFlowNoFlows": {
    message: "No {currency} flows in this period.",
    description:
      "Empty state shown when the cash flow chart has no movement in the presentation currency",
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
