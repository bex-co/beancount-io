export interface TranslationEntry {
  message: string;
  description: string;
}

const ptHoldings: Record<string, TranslationEntry> = {
  "page.holdings.errorExecutingQuery": {
    message: "Ocorreu um erro while executing the query",
    description: "Generic error message for query execution failure",
  },
  "page.holdings.exportCsv": {
    message: "Exportar CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Participações",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Participações por Conta",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Participações por Moeda de Custo",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Participações por Moeda",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Nenhum dado retornado da consulta",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Nenhum resultado de consulta disponível",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Resultado da Consulta",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "linha",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Tipo de resultado desconhecido",
    description: "Error message for unrecognized result type",
  },
};

export default ptHoldings;
