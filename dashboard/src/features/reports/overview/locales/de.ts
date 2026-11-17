import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const deOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "Laufend",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Zahlungsströme",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Nettovermögen nach Monat",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Monat",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.de,
  ...emptyLedgerOverviewTranslations.de,
  "page.overview.cashFlow": {
    message: "Cashflow",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Die Übersichtsinformationen zum Hauptbuch konnten nicht geladen werden. Bitte versuchen Sie es später erneut.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "Übersichtsdaten werden geladen…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Kontorollen werden geladen…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "In Barmittel",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "Aus Barmitteln",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "Beträge werden in {unit} angezeigt. Bestände in {others} sind nicht enthalten.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "Stern",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Mit Stern versehen",
    description: "Button label indicating the ledger is starred",
  },
};

export default deOverview;
