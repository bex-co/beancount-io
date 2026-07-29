export interface TranslationEntry {
  message: string;
  description: string;
}

const skBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Vykonať dotaz",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Vykonáva sa...",
    description: "Button text when query is executing",
  },
  "bql.queryExecutionError": {
    message: "Počas vykonávania dotazu nastala chyba",
    description: "Generic error message for query execution",
  },
  "bql.queryResults": {
    message: "Výsledky dotazu",
    description: "Section title for query results",
  },
  "bql.queryShortcutHint": {
    message:
      "Stlačte Cmd+Enter (Mac) alebo Ctrl+Enter (Windows/Linux) pre vykonanie dotazu",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "História dotazov",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Stiahnuť CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Zatiaľ neboli vykonané žiadne dotazy. Zadajte dotaz vyššie, aby ste mohli začať.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Odstrániť dotaz",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} riadkov",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Dotaz",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Výsledok dotazu",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Neznámy typ výsledku",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Dotaz nevrátil žiadne údaje",
    description: "Message when a query returns no data",
  },
};

export default skBql;
