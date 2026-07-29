export interface TranslationEntry {
  message: string;
  description: string;
}

const deHoldings: Record<string, TranslationEntry> = {
  "page.holdings.errorExecutingQuery": {
    message: "Ein Fehler ist aufgetreten while executing the query",
    description: "Generic error message for query execution failure",
  },
  "page.holdings.exportCsv": {
    message: "CSV exportieren",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Bestände",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Bestände nach Konto",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Bestände nach Kostenwährung",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Bestände nach Währung",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Keine Daten von der Abfrage zurückgegeben",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Keine Abfrageergebnisse verfügbar",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Abfrageergebnis",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "Zeile",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Unbekannter Ergebnistyp",
    description: "Error message for unrecognized result type",
  },
};

export default deHoldings;
