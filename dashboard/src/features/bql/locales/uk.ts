export interface TranslationEntry {
  message: string;
  description: string;
}

const ukBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Виконати запит",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Виконання...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Натисніть Cmd+Enter (Mac) або Ctrl+Enter (Windows/Linux) для виконання запиту",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Історія запитів",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Завантажити CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message: "Запити ще не виконувалися. Введіть запит вище, щоб почати.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Видалити запит",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} рядків",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Запит",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Результат запиту",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "Невідомий тип результату",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Запит не повернув даних",
    description: "Message when a query returns no data",
  },
};

export default ukBql;
