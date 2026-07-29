export interface TranslationEntry {
  message: string;
  description: string;
}

const bgStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Последни записи в сметката",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Дата на последен запис и баланс за {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Брой",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "записа в",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Брой записи по тип",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Брой записи на сметка",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Тип запис",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Грешка",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Неуспешно зареждане на записите в сметката",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Неуспешно зареждане на статистика за записите",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Неуспешно зареждане на данните за проводките",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Дата на последен запис",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Зареждане на статистика за записите...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Зареждане на резултати от заявката...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Няма налични данни",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Заявката не върна резултати",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Процент",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Проводки на {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Статистика",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "Общо",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "типа",
    description: "Label for types count",
  },
};

export default bgStatistics;
