export interface TranslationEntry {
  message: string;
  description: string;
}

const nlHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "CSV exporteren",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Bezittingen",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Bezittingen per rekening",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Bezittingen per kostenvaluta",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Bezittingen per valuta",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Geen gegevens geretourneerd door query",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Geen query resultaten beschikbaar",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Query resultaat",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "rij",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Onbekend resultaattype",
    description: "Error message for unrecognized result type",
  },
};

export default nlHoldings;
