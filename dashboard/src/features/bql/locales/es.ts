export interface TranslationEntry {
  message: string;
  description: string;
}

const esBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Ejecutar Consulta",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Ejecutando...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Presione Cmd+Enter (Mac) o Ctrl+Enter (Windows/Linux) para ejecutar la consulta",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Historial de Consultas",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Descargar CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Aún no se han ejecutado consultas. Ingrese una consulta arriba para comenzar.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Eliminar consulta",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} filas",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Consulta",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Resultado de Consulta",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Tipo de resultado desconocido",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "No se obtuvieron datos de la consulta",
    description: "Message when a query returns no data",
  },
};

export default esBql;
