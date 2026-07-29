export interface TranslationEntry {
  message: string;
  description: string;
}

const ruTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Иерархия активов",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Визуальное представление состава {ledgerName} активов",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Капитал Hierarchy",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "Визуальное представление состава {ledgerName} капитала",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Расходы Hierarchy",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Визуальное представление структуры {ledgerName} расходов",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Доход Hierarchy",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Визуальное представление структуры {ledgerName} доходов",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Обязательства Hierarchy",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Визуальное представление состава {ledgerName} обязательств",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message:
      "Данные оборотно-сальдовой ведомости не найдены для этой главной книги.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Оборотно-сальдовая ведомость",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message: "Полный обзор всех счетов с балансами по всем типам счетов",
    description: "Description for trial balance overview",
  },
};

export default ruTrialBalance;
