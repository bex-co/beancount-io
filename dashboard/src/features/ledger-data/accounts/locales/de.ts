export interface TranslationEntry {
  message: string;
  description: string;
}

const deAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "Quelltext der Direktive zur Kontoschließung",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "Quelltext der Direktive zur Kontoeröffnung",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "Aktionen für {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Konto",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "Ergänzen Sie nach {root} einen Namen, etwa {example}.",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
  },
  "page.accounts.accountMustStartWith": {
    message: "Das Konto muss mit einem der folgenden beginnen: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Die Salden hier sind aktuell. Der Zeitfilter gilt für diese Seite nicht.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} ist bereits eröffnet (seit {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} wurde am {date} geschlossen; Beancount erlaubt keine erneute Eröffnung.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Kontoname",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Kontoname ist erforderlich",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Verwenden Sie durch Doppelpunkte getrennte Kontokomponenten ohne Leerzeichen oder leere Teile",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Kontonamen dürfen keine Leerzeichen enthalten.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "Entfernen Sie den leeren Teil: kein „::“ und kein „:“ am Anfang oder Ende.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Jeder Teil muss mit einem Großbuchstaben oder einer Ziffer 0–9 beginnen – „{component}“ tut das nicht (zum Beispiel Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message:
      "„{component}“ darf nur Buchstaben, Ziffern und Bindestriche enthalten.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Konten",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allTypes": {
    message: "Alle Typen",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Saldo",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "Nicht berechnet",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
  },
  "page.accounts.close": {
    message: "Schließen",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Konto schließen",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Dies fügt eine Schließ-Direktive für {account} am {date} hinzu.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closed": {
    message: "Geschlossen",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Konto löschen",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "Dies löscht dauerhaft die Eröffnungs-Direktive für {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Dies löscht dauerhaft die Eröffnungs- und Schließ-Direktiven für {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Buchungen",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Eintraginhalt wird geladen...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.noAccountsFound": {
    message: "Keine Konten gefunden",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Keine Konten entsprechen Ihren aktuellen Filtern.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Offen",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Konto eröffnen",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Eröffnungsdatum",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Konten suchen...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.type": {
    message: "Typ",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Konto {account} geschlossen",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Konto {account} gelöscht",
    description: "Toast shown after deleting an account",
  },
  "page.accounts.accountCount_one": {
    message: "{shown} Konto",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_other": {
    message: "{shown} Konten",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "Kontoblatt öffnen",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "Nur ein Konto mit Saldo null kann geschlossen werden.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "Nur ein Konto ohne Buchungen kann gelöscht werden.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "Salden nicht berechnet",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "Summen je Zeitraum:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "Sonstige",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "Summen:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "An Ihrem Hauptbuch hat sich nichts geändert. Versuchen Sie es noch einmal oder kommen Sie in einer Minute wieder.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "inkl. Unterkonten",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "Negative Salden sind Ihre Schulden",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "Kein Kontoname enthält „{query}“.",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default deAccounts;
