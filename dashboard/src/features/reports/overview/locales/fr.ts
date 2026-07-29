import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const frOverview: Record<string, TranslationEntry> = {
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
