export interface TranslationEntry {
  message: string;
  description: string;
}

const caBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Executar consulta",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Executant...",
    description: "Button text when query is executing",
  },
  "bql.queryExecutionError": {
    message: "S'ha produït un error en executar la consulta",
    description: "Generic error message for query execution",
  },
  "bql.queryResults": {
    message: "Resultats de la consulta",
    description: "Section title for query results",
  },
  "bql.queryShortcutHint": {
    message:
      "Premeu Cmd+Enter (Mac) o Ctrl+Enter (Windows/Linux) per executar la consulta",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Historial de consultes",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Descarregar CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Encara no s'han executat consultes. Introduïu una consulta a dalt per començar.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Eliminar consulta",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} files",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Consulta",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Percentatge",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Estadístiques",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "No data returned from query",
    description: "Message when a query returns no data",
  },
};

export default caBql;
