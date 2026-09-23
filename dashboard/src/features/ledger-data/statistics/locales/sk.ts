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
    message: "Dátum posledného záznamu a zostatok na účet ({count})",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Počet",
    description: "Count column or label",
  },
  "page.statistics.entriesCountByType": {
    message: "Počet záznamov podľa typu",
    description: "Title for entries count by type section",
  },
  "page.statistics.postingsPerAccountSummary": {
    message: "Počet zápisov na účet ({count})",
    description:
      "Postings per Account summary; {count} is the number of accounts listed",
  },
  "page.statistics.entriesByTypeSummary": {
    message: "Záznamy: {entries} · Typy: {types}",
    description:
      "Entries Count by Type summary; {entries} is the total entry count, {types} the number of entry types",
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
  "page.statistics.percentageNotApplicable": {
    message: "Neuplatňuje sa",
    description:
      "Accessible label shown instead of a percentage when the period has no entries",
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
};

export default skStatistics;
