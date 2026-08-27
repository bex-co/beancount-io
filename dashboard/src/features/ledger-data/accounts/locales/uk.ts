export interface TranslationEntry {
  message: string;
  description: string;
}

const ukAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Рахунок",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Рахунок повинен починатися з одного з: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Назва рахунку",
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
    message: "Рахунки",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Всі рахунки beancount у {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Всі типи",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Баланс",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Закрити",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Закрити рахунок",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Це додасть директиву закриття для {account} на {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Дата закриття",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Закрито",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Видалити рахунок",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "Це назавжди видалить директиву відкриття для {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Це назавжди видалить директиви відкриття та закриття для {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Записи",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Завантаження вмісту запису...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Новий",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "Рахунки не знайдено",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Жоден рахунок не відповідає вашим поточним фільтрам.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Відкрито",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Відкрити рахунок",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Дата відкриття",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Пошук рахунків...",
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
    message: "Рахунок {account} закрито",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Обліковий запис {account} видалено",
    description: "Toast shown after deleting an account",
  },
};

export default ukAccounts;
