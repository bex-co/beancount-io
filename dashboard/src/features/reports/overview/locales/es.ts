import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const esOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.es,
  ...emptyLedgerOverviewTranslations.es,
  "page.overview.assetsDistribution": {
    message: "Distribución de Activos",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Representación visual de la composición de {ledgerName} activos",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Flujo de caja",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message:
      "Flujo de dinero desde fuentes de ingresos hacia gastos e inversiones",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Error al cargar la información general del libro mayor. Por favor, inténtelo de nuevo más tarde.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Distribución de Pasivos",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Representación visual de la composición de {ledgerName} pasivos",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Cargando datos generales...",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Estrella",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Con estrella",
    description: "Button label indicating the ledger is starred",
  },
};

export default esOverview;
