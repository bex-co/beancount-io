export interface TranslationEntry {
  message: string;
  description: string;
}

const jaTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "資産階層",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "{ledgerName}の資産構成の視覚的表示",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "純資産階層",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "{ledgerName}の純資産構成の視覚的表示",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "費用階層",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "{ledgerName}の費用構成の視覚的表示",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "収入階層",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "{ledgerName}の収入構成の視覚的表示",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "負債階層",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "{ledgerName}の負債構成の視覚的表示",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "この元帳の試算表データが見つかりません。",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "試算表",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message: "すべての口座タイプにわたる残高を含むすべての口座の包括的な概要",
    description: "Description for trial balance overview",
  },
};

export default jaTrialBalance;
