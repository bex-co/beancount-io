export interface TranslationEntry {
  message: string;
  description: string;
}

const frAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "Source de la directive de fermeture du compte",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "Source de la directive d’ouverture du compte",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "Actions pour {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Compte",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "Ajoutez un nom après {root}, comme dans {example}.",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
  },
  "page.accounts.accountMustStartWith": {
    message:
      "Le compte doit commencer par l'un des éléments suivants : {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Les soldes affichés ici sont actuels. Le filtre de période ne s'applique pas à cette page.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} est déjà ouvert (depuis le {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} a été clôturé le {date} ; Beancount ne permet pas de le rouvrir.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Nom du compte",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Le nom du compte est requis",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Utilisez des composants de compte séparés par des deux-points, sans espaces ni parties vides",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Les noms de compte ne peuvent pas contenir d’espaces.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "Supprimez la partie vide : pas de « :: », ni de « : » au début ou à la fin.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Chaque partie doit commencer par une majuscule ou un chiffre de 0 à 9 — « {component} » ne le fait pas (par exemple Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message:
      "« {component} » ne peut contenir que des lettres, des chiffres et des tirets.",
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
    message: "Tous les types",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Solde",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "Non calculé",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
  },
  "page.accounts.close": {
    message: "Fermer",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Fermer le compte",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message:
      "Cela ajoutera une directive de fermeture pour {account} le {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closed": {
    message: "Fermé",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Supprimer le compte",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message:
      "Cela supprimera définitivement la directive d'ouverture de {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Cela supprimera définitivement les directives d'ouverture et de clôture de {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Écritures",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Chargement du contenu de l'écriture...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.noAccountsFound": {
    message: "Aucun compte trouvé",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Aucun compte ne correspond à vos filtres actuels.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Ouvert",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Ouvrir le compte",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Date d'ouverture",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Rechercher des comptes...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Compte {account} fermé",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Compte {account} supprimé",
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
    message: "Ouvrir le registre",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "Seul un compte au solde nul peut être clôturé.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "Seul un compte sans écritures peut être supprimé.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "Soldes non calculés",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "Totaux par période :",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "Autres",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "Totaux :",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "Votre registre n'a pas changé. Réessayez, ou revenez dans une minute.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "avec les sous-comptes",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "Un solde négatif correspond à ce que vous devez",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "Aucun nom de compte ne contient « {query} ».",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default frAccounts;
