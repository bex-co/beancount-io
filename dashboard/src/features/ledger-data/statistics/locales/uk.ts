export interface TranslationEntry {
  message: string;
  description: string;
}

const ukStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Останні записи рахунку",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Дата останнього запису та баланс за рахунком ({count})",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Кількість",
    description: "Count column or label",
  },
  "page.statistics.entriesCountByType": {
    message: "Кількість записів за типом",
    description: "Title for entries count by type section",
  },
  "page.statistics.postingsPerAccountSummary": {
    message: "Кількість проводок на рахунок ({count})",
    description:
      "Postings per Account summary; {count} is the number of accounts listed",
  },
  "page.statistics.entriesByTypeSummary": {
    message: "Записи: {entries} · Типи: {types}",
    description:
      "Entries Count by Type summary; {entries} is the total entry count, {types} the number of entry types",
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
    message: "Не вдалося завантажити записи рахунку",
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
    message: "Дата останнього запису",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Завантаження статистики записів...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Завантаження результатів запиту...",
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
  "page.statistics.percentageNotApplicable": {
    message: "Не застосовується",
    description:
      "Accessible label shown instead of a percentage when the period has no entries",
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
};

export default ukStatistics;
