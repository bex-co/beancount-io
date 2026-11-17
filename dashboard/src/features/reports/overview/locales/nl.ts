import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const nlOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "Lopend",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Geldstromen",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Nettovermogen per maand",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Maand",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.nl,
  ...emptyLedgerOverviewTranslations.nl,
  "page.overview.cashFlow": {
    message: "Kasstromen",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Overzichtsinformatie van grootboek laden mislukt. Probeer het later opnieuw.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "Overzichtsgegevens laden…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Rekeningrollen laden…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "Naar liquide middelen",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "Uit liquide middelen",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "Bedragen worden weergegeven in {unit}. Saldi in {others} zijn niet inbegrepen.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "Ster",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Met ster",
    description: "Button label indicating the ledger is starred",
  },
};

export default nlOverview;
