export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Счёт Balance",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Отслеживание изменения баланса счёта со временем",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Счёт Journal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Записи журнала, влияющие на счёт:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Счёт Report",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Изменениеs Over Time",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Просмотр изменений счёта со временем",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Ошибка загрузки данных счёта",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Ошибка загрузки данных журнала",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Загрузка данных счёта...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Данные счёта не найдены для этого счёта.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Нет записей журнала",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Записи журнала не найдены для этого счёта.",
    description: "Message when no journal entries exist for account",
  },
};

export default ruAccountReport;
