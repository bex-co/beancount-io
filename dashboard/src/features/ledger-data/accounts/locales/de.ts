export interface TranslationEntry {
  message: string;
  description: string;
}

const deAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Konto",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Das Konto muss mit einem der folgenden beginnen: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Kontoname",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Kontoname ist erforderlich",
    description: "Validation error when account name field is empty",
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
  "page.accounts.allAccountsIn": {
    message: "Alle Beancount-Konten in {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Alle Typen",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Saldo",
    description: "Table column header for account balance",
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
  "page.accounts.closeDate": {
    message: "Schließdatum",
    description: "Table column header for account close date",
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
    message: "Einträge",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Eintraginhalt wird geladen...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Neu",
    description: "Button text to create a new account",
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
  "page.accounts.status": {
    message: "Status",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Konto {account} geschlossen",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
};

export default deAccounts;
