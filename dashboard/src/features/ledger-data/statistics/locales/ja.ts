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
    message: "口座ごとの最終エントリ日と残高（{count}）",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "件数",
    description: "Count column or label",
  },
  "page.statistics.entriesCountByType": {
    message: "タイプ別エントリ数",
    description: "Title for entries count by type section",
  },
  "page.statistics.postingsPerAccountSummary": {
    message: "口座ごとのポスティング数（{count}）",
    description:
      "Postings per Account summary; {count} is the number of accounts listed",
  },
  "page.statistics.entriesByTypeSummary": {
    message: "エントリ: {entries}・種類: {types}",
    description:
      "Entries Count by Type summary; {entries} is the total entry count, {types} the number of entry types",
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
  "page.statistics.percentageNotApplicable": {
    message: "該当なし",
    description:
      "Accessible label shown instead of a percentage when the period has no entries",
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
};

export default jaStatistics;
