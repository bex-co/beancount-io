export interface TranslationEntry {
  message: string;
  description: string;
}

const ukStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Рахунок Last Entries",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Дата останнього запису та баланс для {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Кількість",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "записів у",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Кількість записів за типом",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Кількість записів на рахунок",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Тип запису",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Помилка",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Не вдалося завантажити рахунок entries",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Не вдалося завантажити статистику записів",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Не вдалося завантажити дані проводок",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Пast Entry Date",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Пoading entry statistics...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Пoading query results...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Дані недоступні",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Запит не повернув результатів",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Відсоток",
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
    message: "Комуtal",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "типи",
    description: "Label for types count",
  },
};

export default ukStatistics;
