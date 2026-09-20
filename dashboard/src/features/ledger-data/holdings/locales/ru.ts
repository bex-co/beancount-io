export interface TranslationEntry {
  message: string;
  description: string;
}

const ruHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "Экспорт CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Активы",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Активы по счетам",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Активы по валюте затрат",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Активы по валюте",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Запрос не вернул данных",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Результаты запроса недоступны",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Результат запроса",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "строка",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Неизвестный тип результата",
    description: "Error message for unrecognized result type",
  },
};

export default ruHoldings;
