import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const frOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "Répartition",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "Flux",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "Part du total",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "Part du total en valeur absolue",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
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
  "page.overview.assetsDistribution": {
    message: "Répartition des actifs",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Représentation visuelle de la composition de {ledgerName} actifs",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Flux de trésorerie",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message:
      "Flux d'argent des sources de revenus vers les dépenses et les investissements",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Échec du chargement des informations de synthèse du grand livre. Veuillez réessayer plus tard.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Répartition des passifs",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message:
      "Représentation visuelle de la composition de {ledgerName} passifs",
    description: "Description for liabilities distribution chart",
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
    message: "Épargne",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "Déficit",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
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
