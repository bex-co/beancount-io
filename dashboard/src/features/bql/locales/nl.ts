export interface TranslationEntry {
  message: string;
  description: string;
}

const nlBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Query uitvoeren",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Uitvoeren...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Druk op Cmd+Enter (Mac) of Ctrl+Enter (Windows/Linux) om de query uit te voeren",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Query geschiedenis",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "CSV downloaden",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Nog geen queries uitgevoerd. Voer hierboven een query in om te beginnen.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Query verwijderen",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "Rijen: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Onbekende kolom ‘{column}’. Controleer de spelling aan de hand van de kolommen die deze query kan selecteren.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Syntaxfout bij “{token}” op teken {position}. Controleer de query vanaf dat punt.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "‘{column}’ moet in {groupBy} staan of in een aggregatiefunctie zoals {sum} of {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message:
      "Er bestaat geen BQL-functie met de naam ‘{name}’. Controleer de spelling.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Er bestaat geen tabel met de naam ‘{table}’. Systeemtabellen beginnen met #, zoals {accounts} of {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() verwacht {count} argument, niet {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() verwacht {count} argumenten, niet {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Een waarde heeft het verkeerde type voor deze vergelijking of functie. Controleer wat de kolom of functie teruggeeft.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Query",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Query resultaat",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Hier zijn alleen de zichtbare rijen beschikbaar. Het CSV-bestand bevat alle rijen (totaal: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
  },
  "page.bql.unknownResultType": {
    message: "Onbekend resultaattype",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Geen gegevens geretourneerd door query",
    description: "Message when a query returns no data",
  },
};

export default nlBql;
