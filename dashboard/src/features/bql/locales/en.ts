export interface TranslationEntry {
  message: string;
  description: string;
}

const enBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Execute Query",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Executing...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to execute query",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Query History",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Download CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message: "No queries executed yet. Enter a query above to get started.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Delete query",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} rows",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Query",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Query Result",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Unknown result type",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "No data returned from query",
    description: "Message when a query returns no data",
  },
};

export default enBql;
