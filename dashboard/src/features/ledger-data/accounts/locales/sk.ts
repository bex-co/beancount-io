export interface TranslationEntry {
  message: string;
  description: string;
}

const skAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Účet",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Účet musí začínať jedným z: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Názov účtu",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Názov účtu je povinný",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Účty",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Všetky beancount účty v {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Všetky typy",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Zostatok",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Zavrieť",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Zavrieť účet",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Toto pridá direktívu uzavretia pre {account} dňa {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Dátum uzavretia",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Uzavretý",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Odstrániť účet",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "Toto natrvalo odstráni direktívu otvorenia pre {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Toto natrvalo odstráni direktívy otvorenia a uzavretia pre {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Záznamy",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Načítavam obsah záznamu...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Nový",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "Nenašli sa žiadne účty",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Žiadne účty nezodpovedajú vašim aktuálnym filtrom.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Otvorený",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Otvoriť účet",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Dátum otvorenia",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Hľadať účty...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "Stav",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Účet {account} bol zavretý",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Účet {account} bol odstránený",
    description: "Toast shown after deleting an account",
  },
};

export default skAccounts;
