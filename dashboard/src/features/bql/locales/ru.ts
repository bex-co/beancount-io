export interface TranslationEntry {
  message: string;
  description: string;
}

const ruBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Выполнить запрос",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Выполняется...",
    description: "Button text when query is executing",
  },
  "bql.queryExecutionError": {
    message: "Произошла ошибка при выполнении запроса",
    description: "Generic error message for query execution",
  },
  "bql.queryResults": {
    message: "Результаты запроса",
    description: "Section title for query results",
  },
  "bql.queryShortcutHint": {
    message:
      "Нажмите Cmd+Enter (Mac) или Ctrl+Enter (Windows/Linux) для выполнения запроса",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "История запросов",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Скачать CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message: "Запросы еще не выполнялись. Введите запрос выше, чтобы начать.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Удалить запрос",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} строк",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Запрос",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Запрос Result",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Неизвестный тип результата",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Запрос не вернул данных",
    description: "Message when a query returns no data",
  },
};

export default ruBql;
