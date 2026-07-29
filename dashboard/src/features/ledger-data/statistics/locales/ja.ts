export interface TranslationEntry {
  message: string;
  description: string;
}

const jaStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "口座の最終エントリ",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "{count} {accounts}の最終エントリ日と残高",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "件数",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "種類にわたるエントリ",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "タイプ別エントリ数",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "口座ごとのエントリ数",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "エントリタイプ",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "エラー",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "口座エントリの読み込みに失敗しました",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "エントリ統計の読み込みに失敗しました",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "ポスティングデータの読み込みに失敗しました",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "最終エントリ日",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "エントリ統計を読み込み中...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "クエリ結果を読み込み中...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "データがありません",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "クエリから結果が返されませんでした",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "割合",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "{account}ごとのポスティング",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "統計",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "合計",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "タイプ",
    description: "Label for types count",
  },
};

export default jaStatistics;
