export interface TranslationEntry {
  message: string;
  description: string;
}

const ruStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Счёт Last Entries",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Дата последней записи и баланс для {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Количество",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "записей по",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Количество записей по типу",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Количество записей на счёт",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Тип записи",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Ошибка",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Не удалось загрузить записи счёта",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Не удалось загрузить статистику записей",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Не удалось загрузить данные проводок",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Последняя запись Date",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Загрузка статистики записей...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Загрузка результатов запроса...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Данные недоступны",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Запрос не вернул результатов",
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
    message: "Итого",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "типов",
    description: "Label for types count",
  },
};

export default ruStatistics;
