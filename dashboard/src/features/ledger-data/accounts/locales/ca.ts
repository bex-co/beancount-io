export interface TranslationEntry {
  message: string;
  description: string;
}

const caAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "Codi font de la directiva de tancament del compte",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "Codi font de la directiva d’obertura del compte",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "Accions per a {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Compte",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "Afegiu un nom després de {root}, com ara {example}.",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
  },
  "page.accounts.accountMustStartWith": {
    message: "El compte ha de començar amb un d'aquests: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Aquí els saldos són actuals. El filtre de temps no s'aplica a aquesta pàgina.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} ja està obert (des del {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} es va tancar el {date}; Beancount no permet tornar-lo a obrir.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Nom del compte",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "El nom del compte és obligatori",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Utilitzeu components de compte separats per dos punts, sense espais ni parts buides",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Els noms de compte no poden contenir espais.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "Elimineu la part buida: sense «::» ni «:» al principi o al final.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Cada part ha de començar amb una lletra majúscula o un dígit del 0 al 9; «{component}» no ho fa (per exemple Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "«{component}» només pot contenir lletres, dígits i guions.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
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
  "page.accounts.allTypes": {
    message: "Tots els tipus",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Balanç",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "No calculat",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
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
  "page.accounts.closed": {
    message: "Tancada",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Eliminar compte",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message:
      "Això suprimirà permanentment la directiva d'obertura de {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Això suprimirà permanentment les directives d'obertura i de tancament de {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Registres",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "S'està carregant el contingut de l'entrada...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.noAccountsFound": {
    message: "No s'han trobat comptes",
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
    message: "Data d'obertura",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Cerca comptes...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.type": {
    message: "Tipus",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "S'ha tancat el compte {account}",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Compte {account} suprimit",
    description: "Toast shown after deleting an account",
  },
  "page.accounts.accountCount_one": {
    message: "{shown} compte",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_many": {
    message: "{shown} de comptes",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_other": {
    message: "{shown} comptes",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "Obre el registre",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "Només es pot tancar un compte amb saldo zero.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "Només es pot eliminar un compte sense registres.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "Saldos no calculats",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "Totals per període:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "Altres",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "Totals:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "No ha canviat res del vostre llibre. Torneu-ho a provar o torneu d'aquí a un minut.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "amb els subcomptes",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "Un saldo negatiu és el que deveu",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "Cap nom de compte conté «{query}».",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default caAccounts;
