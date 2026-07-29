export interface TranslationEntry {
  message: string;
  description: string;
}

const enTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.noData": {
    message: "No trial balance data found for this ledger.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "Trial Balance",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message:
      "Comprehensive overview of all accounts with their balances across all account types",
    description: "Description for trial balance overview",
  },
  "page.trialBalance.assetsHierarchy": {
    message: "Assets Hierarchy",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "Visual representation of {ledgerName} assets composition",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "Liabilities Hierarchy",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "Visual representation of {ledgerName} liabilities composition",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "Income Hierarchy",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "Visual representation of {ledgerName} income composition",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "Expenses Hierarchy",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "Visual representation of {ledgerName} expenses composition",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "Equity Hierarchy",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "Visual representation of {ledgerName} equity composition",
    description: "Description for equity hierarchy visualization",
  },
};

export default enTrialBalance;
