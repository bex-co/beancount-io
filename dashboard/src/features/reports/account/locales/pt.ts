export interface TranslationEntry {
  message: string;
  description: string;
}

const ptAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "Conta Balance",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "Monitore a progressão do saldo da conta ao longo do tempo",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "Conta Journal",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "Lançamentos do diário afetando a conta:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "Conta Report",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "Mudanças ao Longo do Tempo",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "Visualize mudanças na conta ao longo do tempo",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "Erro ao carregar dados da conta",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "Erro ao carregar dados do diário",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "Carregando dados da conta...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "Nenhum dado de conta encontrado para esta conta.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "Nenhum Lançamento no Diário",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "Nenhum lançamento no diário encontrado para esta conta.",
    description: "Message when no journal entries exist for account",
  },
};

export default ptAccountReport;
