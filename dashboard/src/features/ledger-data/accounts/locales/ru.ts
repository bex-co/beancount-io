export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "Исходный текст директивы закрытия счёта",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "Исходный текст директивы открытия счёта",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "Действия для {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Счёт",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "Добавьте имя после {root}, как в {example}.",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
  },
  "page.accounts.accountMustStartWith": {
    message: "Счёт должен начинаться с одного из: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Здесь показаны текущие остатки. Фильтр по времени к этой странице не применяется.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "Счёт {account} уже открыт (с {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "Счёт {account} закрыт {date}; Beancount не позволяет открыть его снова.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Название счёта",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Название счёта обязательно",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Используйте компоненты счёта через двоеточие без пробелов и пустых частей",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Имена счетов не могут содержать пробелы.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message: "Уберите пустую часть: без «::» и без «:» в начале или конце.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Каждая часть должна начинаться с заглавной буквы или цифры от 0 до 9 — «{component}» так не начинается (например, Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "«{component}» может содержать только буквы, цифры и дефисы.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
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
  "page.accounts.allTypes": {
    message: "Все типы",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Баланс",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "Не рассчитан",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
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
    message: "Проводки",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Загрузка содержимого записи...",
    description: "Loading message when fetching entry content in delete dialog",
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
  "page.accounts.type": {
    message: "Тип",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Счёт {account} закрыт",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Аккаунт {account} удален",
    description: "Toast shown after deleting an account",
  },
  "page.accounts.accountCount_one": {
    message: "{shown} счёт",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_few": {
    message: "{shown} счёта",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_many": {
    message: "{shown} счетов",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_other": {
    message: "{shown} счёта",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "Открыть карточку счёта",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "Закрыть можно только счёт с нулевым остатком.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoReferences": {
    message:
      "Счёт можно удалить, только если на него не ссылаются другие записи.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "Остатки не рассчитываются",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "Итоги за период:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "Прочие",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "Итоги:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "В вашей книге ничего не изменилось. Попробуйте ещё раз или вернитесь через минуту.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "с субсчетами",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "Отрицательный остаток — это ваш долг",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "Нет счёта, в названии которого есть «{query}».",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default ruAccounts;
