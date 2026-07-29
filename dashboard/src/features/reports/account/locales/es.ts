export interface TranslationEntry {
  message: string;
  description: string;
}

const esAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Cuenta Balance",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message:
      "Monitorear el progreso del saldo de la cuenta a lo largo del tiempo",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Cuenta Journal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Asientos del diario que afectan la cuenta:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Cuenta Report",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Cambios a lo Largo del Tiempo",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Ver cambios en la cuenta a lo largo del tiempo",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Error al cargar los datos de la cuenta",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Error al cargar los datos del diario",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Cargando datos de la cuenta...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "No se encontraron datos de cuenta para esta cuenta.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Sin Asientos del Diario",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "No se encontraron asientos del diario para esta cuenta.",
    description: "Message when no journal entries exist for account",
  },
};

export default esAccountReport;
