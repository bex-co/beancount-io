export interface TranslationEntry {
  message: string;
  description: string;
}

const ptAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Conta",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "A conta deve começar com um dos: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Nome da conta",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "O nome da conta é obrigatório",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Contas",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Todas as contas beancount em {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Todos os Tipos",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Saldo",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Fechar",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Fechar conta",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message:
      "Isso adicionará uma diretiva de fechamento para {account} em {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Data de fechamento",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Fechada",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Excluir conta",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message:
      "Isso excluirá permanentemente a diretiva de abertura para {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Isso excluirá permanentemente as diretivas de abertura e fechamento para {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Entradas",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Carregando conteúdo da entrada...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Novo",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "Nenhuma conta encontrada",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Nenhuma conta corresponde aos seus filtros atuais.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Aberta",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Abrir conta",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Data de abertura",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Pesquisar contas...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "Status",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Conta {account} fechada",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Conta {account} excluída",
    description: "Toast shown after deleting an account",
  },
};

export default ptAccounts;
