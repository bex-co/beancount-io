export interface TranslationEntry {
  message: string;
  description: string;
}

const zhAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "账户 Balance",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "监控账户余额随时间的变化",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "账户 Journal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "影响账户的日记账条目：",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "账户 Report",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "随时间的变化",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "查看账户随时间的变化",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "加载账户数据时出错",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "加载日记账数据时出错",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "加载账户数据中...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "未找到此账户的数据。",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "无日记账条目",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "未找到日记账条目 for this account.",
    description: "Message when no journal entries exist for account",
  },
};

export default zhAccountReport;
