export interface TranslationEntry {
  message: string;
  description: string;
}

const skBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Vykonať dotaz",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Vykonáva sa...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Stlačte Cmd+Enter (Mac) alebo Ctrl+Enter (Windows/Linux) pre vykonanie dotazu",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "História dotazov",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Stiahnuť CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Zatiaľ neboli vykonané žiadne dotazy. Zadajte dotaz vyššie, aby ste mohli začať.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Odstrániť dotaz",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "Riadky: {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Neznámy stĺpec „{column}“. Skontrolujte jeho pravopis podľa stĺpcov, ktoré môže tento dotaz vybrať.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Syntaktická chyba pri „{token}“ na znaku {position}. Skontrolujte dopyt od tohto miesta.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "Stĺpec „{column}“ musí byť v {groupBy} alebo v agregačnej funkcii, napríklad {sum} alebo {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message: "Funkcia BQL s názvom „{name}“ neexistuje. Skontrolujte pravopis.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Tabuľka s názvom „{table}“ neexistuje. Systémové tabuľky sa začínajú znakom #, napríklad {accounts} alebo {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() prijíma {count} argument, nie {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_few": {
    message: "{name}() prijíma {count} argumenty, nie {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_many": {
    message: "{name}() prijíma {count} argumentu, nie {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() prijíma {count} argumentov, nie {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Hodnota má nesprávny typ pre toto porovnanie alebo funkciu. Skontrolujte, čo stĺpec alebo funkcia vracia.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Dotaz",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Výsledok dotazu",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Tu sú dostupné len viditeľné riadky. Súbor CSV obsahuje všetky riadky (spolu: {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
  },
  "page.bql.unknownResultType": {
    message: "Neznámy typ výsledku",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Dotaz nevrátil žiadne údaje",
    description: "Message when a query returns no data",
  },
};

export default skBql;
