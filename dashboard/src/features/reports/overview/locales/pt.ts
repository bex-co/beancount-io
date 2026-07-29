import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ptOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.pt,
  ...emptyLedgerOverviewTranslations.pt,
  "page.overview.assetsDistribution": {
    message: "Distribuição de Ativos",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Representação visual da composição de {ledgerName} ativos",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Fluxo de caixa",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message:
      "Fluxo de dinheiro de fontes de receita para despesas e investimentos",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Falha ao carregar informações da visão geral do livro-razão. Por favor, tente novamente mais tarde.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Distribuição de Passivos",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Representação visual da composição dos {ledgerName} passivos",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Carregando dados da visão geral…",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Estrela",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Com estrela",
    description: "Button label indicating the ledger is starred",
  },
};

export default ptOverview;
