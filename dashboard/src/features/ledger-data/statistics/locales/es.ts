export interface TranslationEntry {
  message: string;
  description: string;
}

const esStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Cuenta Last Entries",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Fecha de última entrada y saldo para {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Recuento",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "entradas entre",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Conteo de Entradas por Tipo",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Conteo de entradas por cuenta",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Tipo de Entrada",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Error",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Error al cargar las entradas de la cuenta",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Error al cargar las estadísticas de entradas",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Error al cargar los datos de asientos",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Fecha de Última Entrada",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Cargando estadísticas de entradas...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Cargando resultados de consulta...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "No hay datos disponibles",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "No se obtuvieron resultados de la consulta",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Porcentaje",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Asientos por {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Estadísticas",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "Total",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "tipos",
    description: "Label for types count",
  },
};

export default esStatistics;
