import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const caOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.ca,
  ...emptyLedgerOverviewTranslations.ca,
  "page.overview.assetsDistribution": {
    message:
      "Seguir {ledgerName} actius en diferents monedes al llarg del temps",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Representació visual de la composició de {ledgerName} actius",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Flux de caixa",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message:
      "Flux de diners des de fonts d'ingressos cap a despeses i inversions",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message: "Error en carregar les opcions de filtre",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message:
      "Seguir els {ledgerName} passius en diferents monedes al llarg del temps",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Representació visual de la composició dels {ledgerName} passius",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Carregant comptes...",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Estrella",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Amb estrella",
    description: "Button label indicating the ledger is starred",
  },
};

export default caOverview;
