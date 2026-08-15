export interface TranslationEntry {
  message: string;
  description: string;
}

const skHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "Exportovať CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "Portfólio",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "Portfólio podľa účtu",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "Portfólio podľa obstarávacej meny",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "Portfólio podľa meny",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "Dotaz nevrátil žiadne údaje",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "Žiadne výsledky dotazu nie sú k dispozícii",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "Výsledok dotazu",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "riadok",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "Neznámy typ výsledku",
    description: "Error message for unrecognized result type",
  },
};

export default skHoldings;
