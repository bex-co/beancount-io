export interface TranslationEntry {
  message: string;
  description: string;
}

const frAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Compte Balance",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Surveiller l'évolution du solde du compte dans le temps",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Compte Journal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Écritures de journal affectant le compte :",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Compte Report",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Évolutions dans le temps",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Voir les variations du compte dans le temps",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Erreur lors du chargement des données du compte",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Erreur lors du chargement des données du journal",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Chargement des données du compte...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Aucune donnée de compte trouvée pour ce compte.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Aucune écriture de journal",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Aucune écriture de journal trouvée pour ce compte.",
    description: "Message when no journal entries exist for account",
  },
};

export default frAccountReport;
