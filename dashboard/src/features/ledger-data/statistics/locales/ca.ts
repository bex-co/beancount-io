export interface TranslationEntry {
  message: string;
  description: string;
}

const caStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Últimes entrades del compte",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Last entry date and balance for {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Recompte",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "entrades a través de",
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
    message: "Error",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Error en carregar les entrades del compte",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Error en carregar els documents",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Error en carregar els esdeveniments",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Participacions per compte",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Participacions per moneda",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Carregant monedes...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Meta",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "No results returned from query",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Cap esdeveniment coincideix amb els vostres filtres actuals.",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Registres per {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Consulta",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "Resultat de la consulta",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "fila",
    description: "Label for types count",
  },
};

export default caStatistics;
