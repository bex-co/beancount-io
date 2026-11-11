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
    message: "Редове: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Непозната колона „{column}“. Проверете изписването ѝ спрямо колоните, които тази заявка може да избере.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Синтактична грешка близо до „{token}“ на символ {position}. Проверете заявката от това място.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.invalidRegex": {
    message:
      "Шаблонът след ~ не е валиден регулярен израз. Проверете скобите и екраниранията.",
    description:
      "Query error when the pattern after ~ is not a valid regular expression",
  },
  "bql.errors.dateArithmetic": {
    message:
      "Тази машина за заявки не може да добавя или изважда дни с + или -. Използвайте {dateAdd}, за да преместите дата, и {dateDiff}, за да преброите дните между две дати.",
    description:
      "Query error for date arithmetic with + or -; {dateAdd} and {dateDiff} are BQL functions left untranslated",
  },
  "bql.errors.stringConcat": {
    message:
      "Тази машина за заявки не може да свързва текст с +. Комбинирайте стойностите извън заявката.",
    description:
      "Query error for joining text with +, which this query engine does not support",
  },
  "bql.errors.idColumn": {
    message:
      "Колоната „{column}“ не се поддържа тук. Филтрирайте по датата, описанието или сметката на записа.",
    description:
      "Query error for the id column, which this query engine does not support; {column} is the column name",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "„{column}“ трябва да е в {groupBy} или в агрегатна функция като {sum} или {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "Няма BQL функция с име „{name}“. Проверете изписването.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Няма таблица с име „{table}“. Системните таблици започват с #, например {accounts} или {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() приема {count} аргумент, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() приема {count} аргумента, а не {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Стойност е от неподходящ тип за това сравнение или тази функция. Проверете какво връща колоната или функцията.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Заявка",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Резултат от заявка",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Тук са достъпни само видимите редове. Файлът CSV съдържа всички редове (общо: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
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
