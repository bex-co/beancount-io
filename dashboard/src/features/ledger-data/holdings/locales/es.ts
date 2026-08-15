export interface TranslationEntry {
  message: string;
  description: string;
}

const esHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "Exportar CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Tenencias",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Tenencias por Cuenta",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Tenencias por Moneda de Costo",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Tenencias por Moneda",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "No se obtuvieron datos de la consulta",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "No hay resultados de consulta disponibles",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Resultado de Consulta",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "fila",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Tipo de resultado desconocido",
    description: "Error message for unrecognized result type",
  },
};

export default esHoldings;
