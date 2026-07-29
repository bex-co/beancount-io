export interface TranslationEntry {
  message: string;
  description: string;
}

const ukTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "Ієрархія активів",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Візуальне представлення структури {ledgerName} активів",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Ієрархія капіталу",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "Візуальне представлення структури {ledgerName} капіталу",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Ієрархія витрат",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Візуальне представлення структури {ledgerName} витрат",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Ієрархія доходів",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Візуальне представлення структури {ledgerName} доходів",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Пiabilities Hierarchy",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Візуальне представлення структури {ledgerName} зобов'язань",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "Для цієї книги не знайдено даних пробного балансу.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Пробний баланс",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Комплексний огляд всіх рахунків із їх залишками по всіх типах рахунків",
    description: "Description for trial balance overview",
  },
};

export default ukTrialBalance;
