export interface TranslationEntry {
  message: string;
  description: string;
}

const zhTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "资产层级",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "{ledgerName}资产构成的可视化表示",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "权益层级",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "{ledgerName}权益构成的可视化表示",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "支出层级",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "{ledgerName}支出构成的可视化表示",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "收入层级",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "{ledgerName}收入构成的可视化表示",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "负债层级",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "{ledgerName}负债构成的可视化表示",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "未找到此账本的试算平衡表数据。",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "试算平衡表",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message: "所有账户类型的账户余额综合概览",
    description: "Description for trial balance overview",
  },
};

export default zhTrialBalance;
