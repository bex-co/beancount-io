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
    message: "Rows: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Unknown column “{column}”. Check its spelling against the columns this query can select.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Syntax error near “{token}” at character {position}. Check the query from that point.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "“{column}” must be listed in {groupBy} or wrapped in an aggregate such as {sum} or {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "There is no BQL function named “{name}”. Check its spelling.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "There is no table named “{table}”. System tables start with #, such as {accounts} or {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() takes {count} argument, not {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() takes {count} arguments, not {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "A value has the wrong type for this comparison or function. Check what the column or function returns.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Query",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Query Result",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Only the rows in view are available here. Download CSV contains every row (total: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
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
