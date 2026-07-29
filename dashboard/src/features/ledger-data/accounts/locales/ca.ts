export interface TranslationEntry {
  message: string;
  description: string;
}

const caAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Compte",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Account must start with one of: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Nom del compte",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "El nom del compte és obligatori",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Comptes",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Tots els comptes de beancount a {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Tots els tipus",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Balanç",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Tancar",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Tancar compte",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message:
      "Això afegirà una directiva de tancament per a {account} el {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Data de tancament",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Tancada",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Eliminar compte",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "This will permanently delete the open directive for {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "This will permanently delete the open and close directives for {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Entrades",
    description: "Table column header for entry count",
  },
  "page.accounts.failedToLoadAccounts": {
    message: "Error en carregar els comptes",
    description: "Error message when accounts fail to load",
  },
  "page.accounts.loadingAccounts": {
    message: "Carregant comptes...",
    description: "Loading message when fetching accounts",
  },
  "page.accounts.loadingEntryContent": {
    message: "Loading entry content...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Nou",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "No accounts found",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Cap compte coincideix amb els vostres filtres actuals.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Obert",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Obrir compte",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Open Date",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.operation": {
    message: "Operació",
    description: "Table column header for available operations on an account",
  },
  "page.accounts.searchAccounts": {
    message: "Cerca comptes...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "Estat",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
};

export default caAccounts;
