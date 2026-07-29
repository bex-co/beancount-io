export interface TranslationEntry {
  message: string;
  description: string;
}

const zhHoldings: Record<string, TranslationEntry> = {
  "page.holdings.errorExecutingQuery": {
    message: "发生错误 while executing the query",
    description: "Generic error message for query execution failure",
  },
  "page.holdings.exportCsv": {
    message: "导出 CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "持仓",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "按账户持有",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "按成本货币持有",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "按货币持有",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "无数据 returned from query",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "无可用查询结果",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "查询结果",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "行",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "未知结果类型",
    description: "Error message for unrecognized result type",
  },
};

export default zhHoldings;
