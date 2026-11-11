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
    message: "Рядків: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Невідомий стовпець «{column}». Перевірте його написання за списком стовпців, які може вибрати цей запит.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Синтаксична помилка біля «{token}» на символі {position}. Перевірте запит із цього місця.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "Стовпець «{column}» має бути в {groupBy} або всередині агрегатної функції, наприклад {sum} чи {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "Функції BQL з назвою «{name}» немає. Перевірте написання.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Таблиці з назвою «{table}» немає. Системні таблиці починаються з #, наприклад {accounts} або {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() приймає {count} аргумент, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_few": {
    message: "{name}() приймає {count} аргументи, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_many": {
    message: "{name}() приймає {count} аргументів, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() приймає {count} аргументу, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Значення має невідповідний тип для цього порівняння або функції. Перевірте, що повертає стовпець або функція.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Запит",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Результат запиту",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Тут доступні лише видимі рядки. Файл CSV містить усі рядки (усього: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
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
