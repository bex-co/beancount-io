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
    message: "Compte",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Balanç de situació",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Canvis al llarg del temps",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message:
      "Representació visual de la composició del {ledgerName} patrimoni net",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Error en carregar les dades",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Representació visual de la composició dels {ledgerName} passius",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message:
      "Seguir el {ledgerName} patrimoni net en diferents monedes al llarg del temps",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message:
      "No s'han trobat dades del compte de resultats per a aquest llibre.",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Sense entrades de diari",
    description: "Message when no journal entries exist for account",
  },
};

export default caAccountReport;
