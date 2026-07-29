export interface TranslationEntry {
  message: string;
  description: string;
}

const bgBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Изпълнение на заявка",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Изпълнява се...",
    description: "Button text when query is executing",
  },
  "bql.queryExecutionError": {
    message: "Възникна грешка при изпълнението на заявката",
    description: "Generic error message for query execution",
  },
  "bql.queryResults": {
    message: "Резултати от заявката",
    description: "Section title for query results",
  },
  "bql.queryShortcutHint": {
    message:
      "Натиснете Cmd+Enter (Mac) или Ctrl+Enter (Windows/Linux), за да изпълните заявка",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "История на заявките",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Изтегли CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Все още няма изпълнени заявки. Въведете заявка по-горе, за да започнете.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Изтриване на заявка",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} реда",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Заявка",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Резултат от заявка",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Неизвестен тип резултат",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Заявката не върна данни",
    description: "Message when a query returns no data",
  },
};

export default bgBql;
