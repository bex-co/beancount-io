export interface TranslationEntry {
  message: string;
  description: string;
}

const zhStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "账户最近条目",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "最近条目日期和余额，共 {count} 个{accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "数量",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "个条目，涵盖",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "按类型统计条目数",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "每个账户的条目数",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "条目类型",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "错误",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "加载账户条目失败",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "加载条目统计失败",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "加载过账数据失败",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "最后条目日期",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "加载条目统计中...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "加载查询结果中...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "无数据 available",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "查询未返回结果",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "百分比",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "每个{account}的过账",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "统计",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "总计",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "类型",
    description: "Label for types count",
  },
};

export default zhStatistics;
