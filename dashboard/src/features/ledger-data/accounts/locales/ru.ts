export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Счёт",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Счёт должен начинаться с одного из: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Название счёта",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Название счёта обязательно",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Счета",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Все счета Beancount в {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Все типы",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Баланс",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Закрыть",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Закрыть счёт",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Это добавит директиву закрытия для {account} на {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Дата закрытия",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Закрыт",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Удалить счёт",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "Это навсегда удалит директиву открытия для {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message: "Это навсегда удалит директивы открытия и закрытия для {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Записи",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Загрузка содержимого записи...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Новый",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "Счета не найдены",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Ни один счёт не соответствует вашим текущим фильтрам.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Открыт",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Открыть счёт",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Дата открытия",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Поиск счетов...",
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
    message: "Счёт {account} закрыт",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
};

export default ruAccounts;
