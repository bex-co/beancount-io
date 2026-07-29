export interface TranslationEntry {
  message: string;
  description: string;
}

const ukHoldings: Record<string, TranslationEntry> = {
  "page.holdings.errorExecutingQuery": {
    message: "Сталася помилка while executing the query",
    description: "Generic error message for query execution failure",
  },
  "page.holdings.exportCsv": {
    message: "Експорт CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Холдинги",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Холдинги за рахунками",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Холдинги за валютою собівартості",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Холдинги за валютою",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Запит не повернув даних",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Результати запиту недоступні",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Результат запиту",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "рядок",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Невідомий тип результату",
    description: "Error message for unrecognized result type",
  },
};

export default ukHoldings;
