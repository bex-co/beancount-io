export interface TranslationEntry {
  message: string;
  description: string;
}

const deStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Letzte Kontoeinträge",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Datum des letzten Eintrags und Saldo für {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Anzahl",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "Einträge über",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Anzahl der Einträge nach Typ",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Anzahl der Einträge pro Konto",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Eintragstyp",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Fehler",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Kontoeinträge konnten nicht geladen werden",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Eintragsstatistiken konnten nicht geladen werden",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Buchungsdaten konnten nicht geladen werden",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Datum des letzten Eintrags",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Eintragsstatistiken werden geladen...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Abfrageergebnisse werden geladen...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Keine Daten verfügbar",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Keine Ergebnisse von der Abfrage zurückgegeben",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Prozentsatz",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Buchungen pro {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Statistiken",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "Gesamt",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "Typen",
    description: "Label for types count",
  },
};

export default deStatistics;
