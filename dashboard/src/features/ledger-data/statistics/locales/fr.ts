export interface TranslationEntry {
  message: string;
  description: string;
}

const frStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Compte Last Entries",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Date de dernière écriture et solde pour {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Décompte",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "écritures sur",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Entries Count by Type",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Entry count per account",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Entry Type",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Erreur",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Échec du chargement des écritures du compte",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Échec du chargement des statistiques des écritures",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Échec du chargement des données de comptabilisation",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Date de dernière écriture",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Chargement des statistiques des écritures...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Chargement des résultats de la requête...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Aucune donnée disponible",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Aucun résultat retourné par la requête",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Pourcentage",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Écritures par {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Statistiques",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "Total",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "types",
    description: "Label for types count",
  },
};

export default frStatistics;
