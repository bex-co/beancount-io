export interface TranslationEntry {
  message: string;
  description: string;
}

const bgAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Сметка",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Сметката трябва да започва с един от: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Наименование на сметката",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Наименованието на сметката е задължително",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Сметки",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Всички сметки в beancount в {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Всички типове",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Баланс",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Затвори",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Затвори сметка",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Това ще добави директива за затваряне на {account} на {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Дата на затваряне",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Затворена",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Изтрий сметка",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "Това ще изтрие перманентно директивата за отваряне на {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Това ще изтрие перманентно директивите за отваряне и затваряне на {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Записи",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Зареждане на съдържанието на записа...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Нов",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "Не са намерени сметки",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Няма сметки, отговарящи на текущите ви филтри.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Отворена",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Отвори сметка",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Дата на отваряне",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Търси сметки...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "Статус",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Сметката {account} е затворена",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
};

export default bgAccounts;
