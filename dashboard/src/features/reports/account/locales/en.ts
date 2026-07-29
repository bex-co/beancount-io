export interface TranslationEntry {
  message: string;
  description: string;
}

const enAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.title": {
    message: "Account Report",
    description: "Title for account report page",
  },
  "page.accountReport.accountBalance": {
    message: "Account Balance",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Monitor account balance progression over time",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Account Journal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Journal entries affecting account:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.changesOverTime": {
    message: "Changes Over Time",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "View account changes over time",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Error loading account data",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Error loading journal data",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Loading account data...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "No account data found for this account.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "No Journal Entries",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "No journal entries found for this account.",
    description: "Message when no journal entries exist for account",
  },
};

export default enAccountReport;
