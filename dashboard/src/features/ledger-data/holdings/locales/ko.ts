export interface TranslationEntry {
  message: string;
  description: string;
}

const koHoldings: Record<string, TranslationEntry> = {
  "page.holdings.errorExecutingQuery": {
    message: "쿼리 실행 중 오류가 발생했습니다",
    description: "Generic error message for query execution failure",
  },
  "page.holdings.exportCsv": {
    message: "CSV 내보내기",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "보유 자산",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "계정별 보유 자산",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "비용 통화별 보유 자산",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "통화별 보유 자산",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "쿼리에서 반환된 데이터가 없습니다",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "쿼리 결과가 없습니다",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "쿼리 결과",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "행",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "알 수 없는 결과 유형",
    description: "Error message for unrecognized result type",
  },
};

export default koHoldings;
