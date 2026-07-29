export interface TranslationEntry {
  message: string;
  description: string;
}

const nlAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Rekeningsaldo",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Volg de balans van rekeningen over tijd",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Rekeningjournaal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Journaalposten die rekening beïnvloeden:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Rekeningrapport",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Wijzigingen over tijd",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Bekijk rekeningwijzigingen over tijd",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Fout bij laden rekeninggegevens",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Fout bij laden journaalgegevens",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Rekeninggegevens laden...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Geen rekeninggegevens gevonden voor deze rekening.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Geen journaalposten",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Geen journaalposten gevonden voor deze rekening.",
    description: "Message when no journal entries exist for account",
  },
};

export default nlAccountReport;
