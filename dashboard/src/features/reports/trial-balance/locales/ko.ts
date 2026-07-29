export interface TranslationEntry {
  message: string;
  description: string;
}

const koTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "자산 계층",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "{ledgerName} 자산 구성의 시각적 표현",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "자본 계층",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "{ledgerName} 자본 구성의 시각적 표현",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "지출 계층",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "{ledgerName} 지출 구성의 시각적 표현",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "수입 계층",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "{ledgerName} 수입 구성의 시각적 표현",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "부채 계층",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "{ledgerName} 부채 구성의 시각적 표현",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "이 장부의 시산표 데이터를 찾을 수 없습니다.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "시산표",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message: "모든 계정 유형에 걸쳐 잔액이 있는 모든 계정의 포괄적인 개요",
    description: "Description for trial balance overview",
  },
};

export default koTrialBalance;
