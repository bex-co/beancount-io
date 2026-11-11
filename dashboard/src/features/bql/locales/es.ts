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
    message: "Filas: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Columna desconocida «{column}». Revise su ortografía frente a las columnas que esta consulta puede seleccionar.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Error de sintaxis cerca de «{token}» en el carácter {position}. Revisa la consulta desde ese punto.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.invalidRegex": {
    message:
      "El patrón después de ~ no es una expresión regular válida. Revise los corchetes y los caracteres de escape.",
    description:
      "Query error when the pattern after ~ is not a valid regular expression",
  },
  "bql.errors.dateArithmetic": {
    message:
      "Este motor de consultas no puede sumar ni restar días con + o -. Use {dateAdd} para desplazar una fecha y {dateDiff} para contar los días entre dos fechas.",
    description:
      "Query error for date arithmetic with + or -; {dateAdd} and {dateDiff} are BQL functions left untranslated",
  },
  "bql.errors.stringConcat": {
    message:
      "Este motor de consultas no puede unir texto con +. Combine los valores fuera de la consulta.",
    description:
      "Query error for joining text with +, which this query engine does not support",
  },
  "bql.errors.idColumn": {
    message:
      "La columna «{column}» no se admite aquí. Filtre por la fecha, la descripción o la cuenta del asiento.",
    description:
      "Query error for the id column, which this query engine does not support; {column} is the column name",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "«{column}» debe figurar en {groupBy} o dentro de una función de agregación como {sum} o {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message:
      "No existe ninguna función BQL llamada «{name}». Revise su ortografía.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "No existe ninguna tabla llamada «{table}». Las tablas del sistema empiezan por #, como {accounts} o {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() admite {count} argumento, no {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_many": {
    message: "{name}() admite {count} argumentos, no {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() admite {count} argumentos, no {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Un valor tiene un tipo incorrecto para esta comparación o función. Revise qué devuelve la columna o la función.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Consulta",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Resultado de Consulta",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Aquí solo están disponibles las filas visibles. El archivo CSV contiene todas las filas (total: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
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
