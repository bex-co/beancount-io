export interface TranslationEntry {
  message: string;
  description: string;
}

const skStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Posledné záznamy účtov",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Dátum posledného záznamu a zostatok pre {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Počet",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "záznamov v",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Počet záznamov podľa typu",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Počet záznamov na účet",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Typ záznamu",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Chyba",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Nepodarilo sa načítať záznamy účtov",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Nepodarilo sa načítať štatistiky záznamov",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Nepodarilo sa načítať údaje o zápisoch",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Dátum posledného záznamu",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Načítavam štatistiky záznamov...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Načítavam výsledky dotazu...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Žiadne údaje nie sú k dispozícii",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Dotaz nevrátil žiadne výsledky",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Percento",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Zápisy na {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Štatistiky",
    description: "Page title for statistics",
  },
  "page.statistics.total": {
    message: "Celkom",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "typoch",
    description: "Label for types count",
  },
};

export default skStatistics;
