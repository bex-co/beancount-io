export interface TranslationEntry {
  message: string;
  description: string;
}

const ptStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Conta Last Entries",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Data da última entrada e saldo para {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Contagem",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "lançamentos em",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "Contagem de Lançamentos por Tipo",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "Contagem de lançamentos por conta",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "Tipo de Lançamento",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Erro",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Falha ao carregar lançamentos da conta",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Falha ao carregar estatísticas de lançamentos",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Falha ao carregar dados de lançamentos",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Data do Último Lançamento",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Carregando estatísticas de lançamentos...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Carregando resultados da consulta...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "Nenhum dado disponível",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "Nenhum resultado retornado da consulta",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Porcentagem",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "Lançamentos por {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Estatísticas",
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

export default ptStatistics;
