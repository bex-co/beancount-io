export interface TranslationEntry {
  message: string;
  description: string;
}

const koStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "계정 최근 항목",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "계정별 최종 항목 날짜 및 잔액 ({count})",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "수량",
    description: "Count column or label",
  },
  "page.statistics.entriesCountByType": {
    message: "유형별 항목 수",
    description: "Title for entries count by type section",
  },
  "page.statistics.postingsPerAccountSummary": {
    message: "계정별 게시 수 ({count})",
    description:
      "Postings per Account summary; {count} is the number of accounts listed",
  },
  "page.statistics.entriesByTypeSummary": {
    message: "항목: {entries} · 유형: {types}",
    description:
      "Entries Count by Type summary; {entries} is the total entry count, {types} the number of entry types",
  },
  "page.statistics.entryType": {
    message: "항목 유형",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "오류",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "계정 항목 불러오기 실패",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "항목 통계 불러오기 실패",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "게시 데이터 불러오기 실패",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "최근 항목 날짜",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "항목 통계 불러오는 중...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "쿼리 결과 불러오는 중...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "데이터 없음",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "쿼리에서 반환된 결과가 없습니다",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "비율",
    description: "Table column header for percentage",
  },
  "page.statistics.percentageNotApplicable": {
    message: "해당 없음",
    description:
      "Accessible label shown instead of a percentage when the period has no entries",
  },
  "page.statistics.postingsPerAccount": {
    message: "{account}당 게시",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "통계",
    description: "Statistics about the ledger",
  },
};

export default koStatistics;
