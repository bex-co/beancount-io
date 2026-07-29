export interface TranslationEntry {
  message: string;
  description: string;
}

const ukAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Рахунок Balance",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Відстежуйте динаміку балансу рахунку з часом",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Рахунок Journal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Журнал entries affecting account:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Рахунок Report",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Змінаs Over Time",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Перегляд змін рахунку з часом",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Помилка loading account data",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Помилка loading journal data",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Пoading account data...",
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
};

export default ukAccountReport;
