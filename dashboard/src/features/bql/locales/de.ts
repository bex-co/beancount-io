export interface TranslationEntry {
  message: string;
  description: string;
}

const deBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Abfrage ausführen",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Wird ausgeführt...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Drücken Sie Cmd+Enter (Mac) oder Strg+Enter (Windows/Linux), um die Abfrage auszuführen",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Abfrageverlauf",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "CSV herunterladen",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Noch keine Abfragen ausgeführt. Geben Sie oben eine Abfrage ein, um zu beginnen.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Abfrage löschen",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} Zeilen",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Abfrage",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Abfrageergebnis",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Unbekannter Ergebnistyp",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Keine Daten von der Abfrage zurückgegeben",
    description: "Message when a query returns no data",
  },
};

export default deBql;
