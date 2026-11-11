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
    message: "Files: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Columna desconeguda «{column}». Comproveu-ne l’ortografia amb les columnes que aquesta consulta pot seleccionar.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Error de sintaxi a prop de «{token}» al caràcter {position}. Reviseu la consulta a partir d’aquest punt.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "«{column}» ha de figurar a {groupBy} o dins d’una funció d’agregació com {sum} o {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message:
      "No hi ha cap funció BQL anomenada «{name}». Comproveu-ne l’ortografia.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "No hi ha cap taula anomenada «{table}». Les taules del sistema comencen amb #, com ara {accounts} o {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() admet {count} argument, no {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_many": {
    message: "{name}() admet {count} arguments, no {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() admet {count} arguments, no {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Un valor té un tipus incorrecte per a aquesta comparació o funció. Comproveu què retorna la columna o la funció.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Consulta",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Percentatge",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Aquí només hi ha disponibles les files visibles. El fitxer CSV conté totes les files (total: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
  },
  "page.bql.unknownResultType": {
    message: "Estadístiques",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "La consulta no ha retornat dades",
    description: "Message when a query returns no data",
  },
};

export default caBql;
