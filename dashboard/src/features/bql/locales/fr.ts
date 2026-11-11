export interface TranslationEntry {
  message: string;
  description: string;
}

const frBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "Exécuter la requête",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "Exécution en cours...",
    description: "Button text when query is executing",
  },
  "bql.queryShortcutHint": {
    message:
      "Appuyez sur Cmd+Entrée (Mac) ou Ctrl+Entrée (Windows/Linux) pour exécuter la requête",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "Historique des requêtes",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "Télécharger CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "Aucune requête exécutée pour le moment. Saisissez une requête ci-dessus pour commencer.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "Supprimer la requête",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "Lignes : {count}",
    description: "Row count for large query results",
  },
  "bql.errors.unknownColumn": {
    message:
      "Colonne inconnue « {column} ». Vérifiez son orthographe parmi les colonnes que cette requête peut sélectionner.",
    description:
      "Query error naming a column the query referenced that does not exist; {column} is the identifier from the query",
  },
  "bql.errors.syntaxError": {
    message:
      "Erreur de syntaxe près de « {token} » au caractère {position}. Vérifiez la requête à partir de cet endroit.",
    description:
      "Query error for a BQL parse failure; {token} is the unexpected token and {position} its 1-based character position in the query",
  },
  "bql.errors.invalidRegex": {
    message:
      "Le motif après ~ n’est pas une expression régulière valide. Vérifiez ses crochets et ses échappements.",
    description:
      "Query error when the pattern after ~ is not a valid regular expression",
  },
  "bql.errors.dateArithmetic": {
    message:
      "Ce moteur de requêtes ne peut pas ajouter ou retirer des jours avec + ou -. Utilisez {dateAdd} pour décaler une date et {dateDiff} pour compter les jours entre deux dates.",
    description:
      "Query error for date arithmetic with + or -; {dateAdd} and {dateDiff} are BQL functions left untranslated",
  },
  "bql.errors.stringConcat": {
    message:
      "Ce moteur de requêtes ne peut pas concaténer du texte avec +. Combinez les valeurs en dehors de la requête.",
    description:
      "Query error for joining text with +, which this query engine does not support",
  },
  "bql.errors.idColumn": {
    message:
      "La colonne « {column} » n’est pas prise en charge ici. Filtrez plutôt sur la date, le libellé ou le compte de l’écriture.",
    description:
      "Query error for the id column, which this query engine does not support; {column} is the column name",
  },
  "bql.errors.ungroupedColumn": {
    message:
      "« {column} » doit figurer dans {groupBy} ou dans une fonction d’agrégation comme {sum} ou {first}.",
    description:
      "Query error for a column that is neither in GROUP BY nor aggregated; {column} is the identifier, {groupBy}, {sum} and {first} are BQL keywords left untranslated",
  },
  "bql.errors.unknownFunction": {
    message:
      "Aucune fonction BQL ne s’appelle « {name} ». Vérifiez son orthographe.",
    description:
      "Query error naming a BQL function that does not exist; {name} is the function name from the query",
  },
  "bql.errors.unknownTable": {
    message:
      "Aucune table ne s’appelle « {table} ». Les tables système commencent par #, comme {accounts} ou {prices}.",
    description:
      "Query error naming a table that does not exist; {table} is the name from the query, {accounts} and {prices} are example system table names left untranslated",
  },
  "bql.errors.argumentCount_one": {
    message: "{name}() prend {count} argument, pas {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_many": {
    message: "{name}() prend {count} arguments, pas {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.argumentCount_other": {
    message: "{name}() prend {count} arguments, pas {got}.",
    description:
      "Query error for a function called with the wrong number of arguments; {name} is the function, {count} the number it takes and {got} the number the query gave",
  },
  "bql.errors.typeError": {
    message:
      "Une valeur n’a pas le bon type pour cette comparaison ou cette fonction. Vérifiez ce que renvoie la colonne ou la fonction.",
    description:
      "Query error when a value has the wrong type for a comparison or function",
  },
  "page.bql.query": {
    message: "Requête",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Résultat de la requête",
    description: "Label for a query result section header",
  },
  "page.bql.largeResultHint": {
    message:
      "Seules les lignes visibles sont disponibles ici. Le fichier CSV contient toutes les lignes (total : {count}).",
    description:
      "Screen-reader note on a result too long to render every row; {count} is the total row count",
  },
  "page.bql.unknownResultType": {
    message: "Type de résultat inconnu",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "Aucune donnée retournée par la requête",
    description: "Message when a query returns no data",
  },
};

export default frBql;
