export interface TranslationEntry {
  message: string;
  description: string;
}

const ukAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Баланс рахунку",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Відстежуйте динаміку балансу рахунку з часом",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Журнал рахунку",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Записи журналу, що впливають на рахунок:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Звіт по рахунку",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Зміни з часом",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Перегляд змін рахунку з часом",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Помилка завантаження даних журналу",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Завантаження даних рахунку...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Для цього рахунку не знайдено даних.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Немає записів журналу",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Для цього рахунку не знайдено записів журналу.",
    description: "Message when no journal entries exist for account",
  },
  "page.accountReport.period": {
    message: "Період",
    description: "Column header for a chart period in the account period table",
  },
  "page.accountReport.periodAmount": {
    message: "Сума",
    description: "Column header for the amounts of a chart period",
  },
  "page.accountReport.periodData": {
    message: "Дані за періодами",
    description: "Disclosure label for the account chart's period data table",
  },
};

export default ukAccountReport;
