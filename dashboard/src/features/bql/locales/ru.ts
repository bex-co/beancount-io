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
    message: "Строк: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Неизвестный столбец «{column}». Проверьте его написание по списку столбцов, которые может выбрать этот запрос.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Синтаксическая ошибка рядом с «{token}» на символе {position}. Проверьте запрос с этого места.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.invalidRegex": {
    message:
      "Шаблон после ~ не является допустимым регулярным выражением. Проверьте скобки и экранирование.",
    description:
      "Query error when the pattern after ~ is not a valid regular expression",
  },
  "bql.errors.dateArithmetic": {
    message:
      "Этот движок запросов не умеет прибавлять или вычитать дни с помощью + или -. Используйте {dateAdd}, чтобы сдвинуть дату, и {dateDiff}, чтобы посчитать дни между двумя датами.",
    description:
      "Query error for date arithmetic with + or -; {dateAdd} and {dateDiff} are BQL functions left untranslated",
  },
  "bql.errors.stringConcat": {
    message:
      "Этот движок запросов не умеет соединять текст с помощью +. Объедините значения вне запроса.",
    description:
      "Query error for joining text with +, which this query engine does not support",
  },
  "bql.errors.idColumn": {
    message:
      "Столбец «{column}» здесь не поддерживается. Фильтруйте по дате, описанию или счёту записи.",
    description:
      "Query error for the id column, which this query engine does not support; {column} is the column name",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "Столбец «{column}» должен быть в {groupBy} или внутри агрегатной функции, например {sum} или {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "Функции BQL с именем «{name}» нет. Проверьте написание.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Таблицы с именем «{table}» нет. Системные таблицы начинаются с #, например {accounts} или {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() принимает {count} аргумент, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_few": {
    message: "{name}() принимает {count} аргумента, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_many": {
    message: "{name}() принимает {count} аргументов, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() принимает {count} аргумента, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Значение имеет неподходящий тип для этого сравнения или функции. Проверьте, что возвращает столбец или функция.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Запрос",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Результат запроса",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Здесь доступны только видимые строки. Файл CSV содержит все строки (всего: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
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
