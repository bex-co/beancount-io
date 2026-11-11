export interface TranslationEntry {
  message: string;
  description: string;
}

const deBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Abfrage ausführen",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Wird ausgeführt...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Drücken Sie Cmd+Enter (Mac) oder Strg+Enter (Windows/Linux), um die Abfrage auszuführen",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Abfrageverlauf",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "CSV herunterladen",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Noch keine Abfragen ausgeführt. Geben Sie oben eine Abfrage ein, um zu beginnen.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Abfrage löschen",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "Zeilen: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Unbekannte Spalte „{column}“. Prüfen Sie die Schreibweise anhand der Spalten, die diese Abfrage auswählen kann.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Syntaxfehler bei „{token}“ an Zeichen {position}. Prüfen Sie die Abfrage ab dieser Stelle.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.invalidRegex": {
    message:
      "Das Muster nach ~ ist kein gültiger regulärer Ausdruck. Prüfen Sie Klammern und Escape-Zeichen.",
    description:
      "Query error when the pattern after ~ is not a valid regular expression",
  },
  "bql.errors.dateArithmetic": {
    message:
      "Diese Abfrage-Engine kann mit + oder - keine Tage addieren oder subtrahieren. Verwenden Sie {dateAdd}, um ein Datum zu verschieben, und {dateDiff}, um die Tage zwischen zwei Daten zu zählen.",
    description:
      "Query error for date arithmetic with + or -; {dateAdd} and {dateDiff} are BQL functions left untranslated",
  },
  "bql.errors.stringConcat": {
    message:
      "Diese Abfrage-Engine kann Text nicht mit + verbinden. Kombinieren Sie die Werte außerhalb der Abfrage.",
    description:
      "Query error for joining text with +, which this query engine does not support",
  },
  "bql.errors.idColumn": {
    message:
      "Die Spalte „{column}“ wird hier nicht unterstützt. Filtern Sie stattdessen nach Datum, Beschreibung oder Konto des Eintrags.",
    description:
      "Query error for the id column, which this query engine does not support; {column} is the column name",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "„{column}“ muss in {groupBy} stehen oder in einer Aggregatfunktion wie {sum} oder {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message:
      "Es gibt keine BQL-Funktion namens „{name}“. Prüfen Sie die Schreibweise.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Es gibt keine Tabelle namens „{table}“. Systemtabellen beginnen mit #, etwa {accounts} oder {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() erwartet {count} Argument, nicht {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() erwartet {count} Argumente, nicht {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Ein Wert hat den falschen Typ für diesen Vergleich oder diese Funktion. Prüfen Sie, was die Spalte oder Funktion zurückgibt.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Abfrage",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Abfrageergebnis",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Hier sind nur die sichtbaren Zeilen verfügbar. Die CSV-Datei enthält alle Zeilen (insgesamt: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
  },
  "page.bql.unknownResultType": {
    message: "Unbekannter Ergebnistyp",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Keine Daten von der Abfrage zurückgegeben",
    description: "Message when a query returns no data",
  },
};

export default deBql;
