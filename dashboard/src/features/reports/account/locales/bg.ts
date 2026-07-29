export interface TranslationEntry {
  message: string;
  description: string;
}

const bgAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Баланс на сметката",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Проследяване на прогресията на баланса на сметката във времето",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Журнал на сметката",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Записи в журнала, засягащи сметка:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Отчет на сметката",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Промени във времето",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Преглед на промените в сметката във времето",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Грешка при зареждане на данните за сметката",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Грешка при зареждане на данните от журнала",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Зареждане на данните за сметката...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Няма намерени данни за тази сметка.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Няма записи в журнала",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Няма намерени записи в журнала за тази сметка.",
    description: "Message when no journal entries exist for account",
  },
};

export default bgAccountReport;
