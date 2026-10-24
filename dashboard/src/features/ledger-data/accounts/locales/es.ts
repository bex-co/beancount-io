export interface TranslationEntry {
  message: string;
  description: string;
}

const esAccounts: Record<string, TranslationEntry> = {
  "page.accounts.actionsForAccount": {
    message: "Acciones para {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Cuenta",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "La cuenta debe comenzar con uno de: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Aquí los saldos son actuales. El filtro de tiempo no se aplica a esta página.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} ya está abierta (desde el {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} se cerró el {date}; Beancount no permite volver a abrirla.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Nombre de cuenta",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "El nombre de cuenta es requerido",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Usa componentes de cuenta separados por dos puntos, sin espacios ni partes vacías",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Los nombres de cuenta no pueden contener espacios.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message: "Quita la parte vacía: sin «::» ni «:» al principio o al final.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Cada parte debe empezar con una letra mayúscula o un dígito del 0 al 9; «{component}» no lo hace (por ejemplo Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "«{component}» solo puede contener letras, dígitos y guiones.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
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
  "page.accounts.balanceNotComputed": {
    message: "No calculado",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
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
    message: "Asientos",
    description: "Table column header for posting count",
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
    message: "Tipo",
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
