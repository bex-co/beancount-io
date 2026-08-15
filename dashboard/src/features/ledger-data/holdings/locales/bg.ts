export interface TranslationEntry {
  message: string;
  description: string;
}

const bgHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "Експорт в CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Активи",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Активи по сметка",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Активи по валута на цена",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Активи по валута",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Заявката не върна данни",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Няма налични резултати от заявка",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Резултат от заявка",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "ред",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Неизвестен тип резултат",
    description: "Error message for unrecognized result type",
  },
};

export default bgHoldings;
