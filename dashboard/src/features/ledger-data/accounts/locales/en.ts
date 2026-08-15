export interface TranslationEntry {
  message: string;
  description: string;
}

const enAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Account",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Account must start with one of: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Account Name",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Account name is required",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Accounts",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "All beancount accounts in {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "All Types",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Balance",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Close",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Close Account",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "This will add a close directive for {account} on {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Close Date",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Closed",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Delete Account",
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
    message: "Entries",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Loading entry content...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "New",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "No accounts found",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "No accounts match your current filters.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Open",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Open Account",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Open Date",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Search accounts...",
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
    message: "Account {account} closed",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
};

export default enAccounts;
