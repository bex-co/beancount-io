export interface TranslationEntry {
  message: string;
  description: string;
}

const caAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Balanç del compte",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message:
      "Monitoritzar la progressió del balanç del compte al llarg del temps",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Diari del compte",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Entrades del diari que afecten el compte:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Informe del compte",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Canvis al llarg del temps",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Veure els canvis del compte al llarg del temps",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Error en carregar les dades del diari",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Carregant les dades del compte...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "No s'han trobat dades per a aquest compte.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Sense entrades de diari",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "No s'han trobat entrades de diari per a aquest compte.",
    description: "Message when no journal entries exist for account",
  },
  "page.accountReport.period": {
    message: "Període",
    description: "Column header for a chart period in the account period table",
  },
  "page.accountReport.periodAmount": {
    message: "Import",
    description: "Column header for the amounts of a chart period",
  },
  "page.accountReport.periodData": {
    message: "Dades per període",
    description: "Disclosure label for the account chart's period data table",
  },
};

export default caAccountReport;
