export interface TranslationEntry {
  message: string;
  description: string;
}

const enHoldings: Record<string, TranslationEntry> = {
  "page.holdings.errorExecutingQuery": {
    message: "An error occurred while executing the query",
    description: "Generic error message for query execution failure",
  },
  "page.holdings.exportCsv": {
    message: "Export CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Holdings",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Holdings by Account",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Holdings by Cost Currency",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Holdings by Currency",
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
    message: "Query Result",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "row",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Unknown result type",
    description: "Error message for unrecognized result type",
  },
};

export default enHoldings;
