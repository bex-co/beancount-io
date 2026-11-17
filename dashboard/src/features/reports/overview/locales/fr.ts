import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const frOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "En cours",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Flux",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Valeur nette par mois",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Mois",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.fr,
  ...emptyLedgerOverviewTranslations.fr,
  "page.overview.cashFlow": {
    message: "Flux de trésorerie",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Échec du chargement des informations de synthèse du grand livre. Veuillez réessayer plus tard.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "Chargement des données de synthèse...",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Chargement des rôles des comptes…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "Versé en trésorerie",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "Puisé dans la trésorerie",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "Les montants sont affichés en {unit}. Les soldes en {others} ne sont pas inclus.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "Étoile",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Avec étoile",
    description: "Button label indicating the ledger is starred",
  },
};

export default frOverview;
