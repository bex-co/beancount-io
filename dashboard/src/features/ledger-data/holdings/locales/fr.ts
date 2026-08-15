export interface TranslationEntry {
  message: string;
  description: string;
}

const frHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "Exporter en CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Avoirs",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Avoirs par compte",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Avoirs par devise de coût",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Avoirs par devise",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Aucune donnée retournée par la requête",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Aucun résultat de requête disponible",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Résultat de la requête",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "ligne",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Type de résultat inconnu",
    description: "Error message for unrecognized result type",
  },
};

export default frHoldings;
