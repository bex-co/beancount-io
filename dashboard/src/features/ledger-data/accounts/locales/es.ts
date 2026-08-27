export interface TranslationEntry {
  message: string;
  description: string;
}

const esAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Cuenta",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "La cuenta debe comenzar con uno de: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Nombre de cuenta",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "El nombre de cuenta es requerido",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Cuentas",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Todas las cuentas de beancount en {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Todos los Tipos",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Saldo",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Cerrar",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Cerrar cuenta",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Esto añadirá una directiva de cierre para {account} el {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Fecha de cierre",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Cerrada",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Eliminar cuenta",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message:
      "Esto eliminará permanentemente la directiva de apertura para {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Esto eliminará permanentemente las directivas de apertura y cierre para {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Entradas",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Cargando contenido del registro...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Nuevo",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "No se encontraron cuentas",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Ninguna cuenta coincide con sus filtros actuales.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Abierta",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Abrir cuenta",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Fecha de apertura",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Buscar cuentas...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "Estado",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Cuenta {account} cerrada",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Cuenta {account} eliminada",
    description: "Toast shown after deleting an account",
  },
};

export default esAccounts;
