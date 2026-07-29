export interface TranslationEntry {
  message: string;
  description: string;
}

const nlStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Laatste boekingen van rekening",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Laatste boekingsdatum en saldo voor {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Aantal",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "boekingen over",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Aantal boekingen per type",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Aantal boekingen per rekening",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Boekingstype",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Fout",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Rekeningboekingen laden mislukt",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Boekingsstatistieken laden mislukt",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Boekingsgegevens laden mislukt",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Laatste boekingsdatum",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Boekingsstatistieken laden...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Query resultaten laden...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Geen gegevens beschikbaar",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Geen resultaten geretourneerd door query",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Percentage",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Boekingen per {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Statistieken",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "Totaal",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "typen",
    description: "Label for types count",
  },
};

export default nlStatistics;
