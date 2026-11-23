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
    message: "Participacions",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Participacions per compte",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Participacions per moneda de cost",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Participacions per moneda",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "La consulta no ha retornat dades",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "No hi ha resultats de consulta disponibles",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Resultat de la consulta",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "fila",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Tipus de resultat desconegut",
    description: "Error message for unrecognized result type",
  },
};

export default caHoldings;
