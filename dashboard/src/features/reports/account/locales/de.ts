export interface TranslationEntry {
  message: string;
  description: string;
}

const deAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Kontosaldo",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Überwachen Sie die Entwicklung des Kontosaldos im Zeitverlauf",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Kontojournal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Journaleinträge, die das Konto betreffen:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Kontobericht",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Änderungen im Zeitverlauf",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Kontoänderungen im Zeitverlauf anzeigen",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Fehler beim Laden der Kontodaten",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Fehler beim Laden der Journaldaten",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Kontodaten werden geladen...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Keine Kontodaten für dieses Konto gefunden.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Keine Journaleinträge",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Keine Journaleinträge für dieses Konto gefunden.",
    description: "Message when no journal entries exist for account",
  },
};

export default deAccountReport;
