export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Баланс счёта",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Отслеживание изменения баланса счёта со временем",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Журнал счёта",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Записи журнала, влияющие на счёт:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Отчёт по счёту",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Изменения со временем",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Просмотр изменений счёта со временем",
    description: "Description for changes over time chart",
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
  "page.accountReport.period": {
    message: "Период",
    description: "Column header for a chart period in the account period table",
  },
  "page.accountReport.periodAmount": {
    message: "Сумма",
    description: "Column header for the amounts of a chart period",
  },
  "page.accountReport.periodData": {
    message: "Данные по периодам",
    description: "Disclosure label for the account chart's period data table",
  },
};

export default ruAccountReport;
