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
    message: "{count} lignes",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "Requête",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "Résultat de la requête",
    description: "Label for a query result section header",
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
