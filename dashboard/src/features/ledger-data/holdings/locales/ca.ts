export interface TranslationEntry {
  message: string;
  description: string;
}

const caHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "Exportar CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Nom del fitxer",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Holdings by Account",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Anar al compte",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Participacions",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "No data returned from query",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "No query results available",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Percentatge",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "Apunts per compte",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Estadístiques",
    description: "Error message for unrecognized result type",
  },
};

export default caHoldings;
