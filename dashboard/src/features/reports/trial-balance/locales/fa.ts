export interface TranslationEntry {
  message: string;
  description: string;
}

const faTrialBalance: Record<string, TranslationEntry> = {
  "page.trialBalance.assetsHierarchy": {
    message: "سلسله‌مراتب دارایی‌ها",
    description: "Title for assets hierarchy card",
  },
  "page.trialBalance.assetsHierarchyDescription": {
    message: "نمایش بصری از ترکیب دارایی‌های {ledgerName}",
    description: "Description for assets hierarchy visualization",
  },
  "page.trialBalance.equityHierarchy": {
    message: "سلسله‌مراتب حقوق صاحبان سهام",
    description: "Title for equity hierarchy card",
  },
  "page.trialBalance.equityHierarchyDescription": {
    message: "نمایش بصری از ترکیب حقوق صاحبان سهام {ledgerName}",
    description: "Description for equity hierarchy visualization",
  },
  "page.trialBalance.expensesHierarchy": {
    message: "سلسله‌مراتب هزینه‌ها",
    description: "Title for expenses hierarchy card",
  },
  "page.trialBalance.expensesHierarchyDescription": {
    message: "نمایش بصری از ترکیب هزینه‌های {ledgerName}",
    description: "Description for expenses hierarchy visualization",
  },
  "page.trialBalance.incomeHierarchy": {
    message: "سلسله‌مراتب درآمد",
    description: "Title for income hierarchy card",
  },
  "page.trialBalance.incomeHierarchyDescription": {
    message: "نمایش بصری از ترکیب درآمد {ledgerName}",
    description: "Description for income hierarchy visualization",
  },
  "page.trialBalance.liabilitiesHierarchy": {
    message: "سلسله‌مراتب بدهی‌ها",
    description: "Title for liabilities hierarchy card",
  },
  "page.trialBalance.liabilitiesHierarchyDescription": {
    message: "نمایش بصری از ترکیب بدهی‌های {ledgerName}",
    description: "Description for liabilities hierarchy visualization",
  },
  "page.trialBalance.noData": {
    message: "هیچ داده تراز آزمایشی برای این دفتر یافت نشد.",
    description: "Message when no trial balance data exists",
  },
  "page.trialBalance.overviewTitle": {
    message: "تراز آزمایشی",
    description: "Title for trial balance overview section",
  },
  "page.trialBalance.overviewDescription": {
    message: "نمای کامل از تمام حساب‌ها با مانده‌های آن‌ها در تمام انواع حساب",
    description: "Description for trial balance overview",
  },
};

export default faTrialBalance;
