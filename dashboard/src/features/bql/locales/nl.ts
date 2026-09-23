export interface TranslationEntry {
  message: string;
  description: string;
}

const nlBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Query uitvoeren",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Uitvoeren...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Druk op Cmd+Enter (Mac) of Ctrl+Enter (Windows/Linux) om de query uit te voeren",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Query geschiedenis",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Download CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Nog geen queries uitgevoerd. Voer hierboven een query in om te beginnen.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Query verwijderen",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "Rijen: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Onbekende kolom ‘{column}’. Controleer de spelling aan de hand van de kolommen die deze query kan selecteren.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "page.bql.query": {
    message: "Query",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Query resultaat",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Onbekend resultaattype",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Geen gegevens geretourneerd door query",
    description: "Message when a query returns no data",
  },
};

export default nlBql;
