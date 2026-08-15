export interface TranslationEntry {
  message: string;
  description: string;
}

const jaHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "CSVエクスポート",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "保有資産",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "口座別保有資産",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "コスト通貨別保有資産",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "通貨別保有資産",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "クエリからデータが返されませんでした",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "クエリ結果がありません",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "クエリ結果",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "行",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "不明な結果タイプ",
    description: "Error message for unrecognized result type",
  },
};

export default jaHoldings;
