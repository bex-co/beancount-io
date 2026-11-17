import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ptOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "Em andamento",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Fluxos",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Patrimônio líquido por mês",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Mês",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.pt,
  ...emptyLedgerOverviewTranslations.pt,
  "page.overview.cashFlow": {
    message: "Fluxo de caixa",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Falha ao carregar informações da visão geral do livro-razão. Por favor, tente novamente mais tarde.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "Carregando dados da visão geral…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Carregando as funções das contas…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "Para o caixa",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "Do caixa",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "Os valores são apresentados em {unit}. Os saldos em {others} não estão incluídos.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
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
