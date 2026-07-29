export interface TranslationEntry {
  message: string;
  description: string;
}

const ptTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Hierarquia de Ativos",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Representação visual da composição de {ledgerName} ativos",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Hierarquia de Patrimônio",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "Representação visual da composição do {ledgerName} patrimônio",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Hierarquia de Despesas",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Representação visual da composição de {ledgerName} despesas",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Hierarquia de Renda",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Representação visual da composição da {ledgerName} renda",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Hierarquia de Passivos",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Representação visual da composição dos {ledgerName} passivos",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "Nenhum dado de balancete encontrado para este livro-razão.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Balancete",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Visão geral abrangente de todas as contas com seus saldos em todos os tipos de conta",
    description: "Description for trial balance overview",
  },
};

export default ptTrialBalance;
