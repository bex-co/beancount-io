export interface TranslationEntry {
  message: string;
  description: string;
}

const skAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Zostatok účtu",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Sledujte vývoj zostatku účtu v čase",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Denník účtu",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Záznamy v denníku ovplyvňujúce účet:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Prehľad účtu",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Zmeny v čase",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Zobraziť zmeny na účte v čase",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Chyba pri načítaní údajov účtu",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Chyba pri načítaní dát denníka",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Načítavam údaje účtu...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Pre tento účet sa nenašli žiadne údaje.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Žiadne záznamy v denníku",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Pre tento účet sa nenašli žiadne záznamy v denníku.",
    description: "Message when no journal entries exist for account",
  },
};

export default skAccountReport;
