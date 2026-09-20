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
    message: "Distribució d'actius",
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
    message:
      "No s'ha pogut carregar la informació del resum del llibre. Torneu-ho a provar més tard.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Distribució de passius",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Representació visual de la composició dels {ledgerName} passius",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Carregant les dades del resum…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Carregant els rols dels comptes…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.chartUnitScope": {
    message:
      "Els imports es mostren en {unit}. Els saldos en {others} no s'hi inclouen.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
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
