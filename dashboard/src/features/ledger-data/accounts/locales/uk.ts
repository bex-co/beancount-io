export interface TranslationEntry {
  message: string;
  description: string;
}

const ukAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "Вихідний текст директиви закриття рахунку",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "Вихідний текст директиви відкриття рахунку",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "Дії для {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Рахунок",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "Додайте назву після {root}, як у {example}.",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
  },
  "page.accounts.accountMustStartWith": {
    message: "Рахунок повинен починатися з одного з: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Тут показано поточні залишки. Фільтр за часом до цієї сторінки не застосовується.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "Рахунок {account} уже відкрито (з {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "Рахунок {account} закрито {date}; Beancount не дозволяє відкрити його знову.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Назва рахунку",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Назва рахунку обов'язкова",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Використовуйте компоненти рахунку через двокрапку без пробілів і порожніх частин",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Назви рахунків не можуть містити пробіли.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "Приберіть порожню частину: без «::» і без «:» на початку чи в кінці.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Кожна частина має починатися з великої літери або цифри від 0 до 9 — «{component}» так не починається (наприклад, Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "«{component}» може містити лише літери, цифри та дефіси.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
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
  "page.accounts.allTypes": {
    message: "Всі типи",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Баланс",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "Не обчислено",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
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
    message: "Проводки",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Завантаження вмісту запису...",
    description: "Loading message when fetching entry content in delete dialog",
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
  "page.accounts.type": {
    message: "Тип",
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
  "page.accounts.accountCount_one": {
    message: "{shown} рахунок",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_few": {
    message: "{shown} рахунки",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_many": {
    message: "{shown} рахунків",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_other": {
    message: "{shown} рахунку",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "Відкрити картку рахунку",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "Закрити можна лише рахунок із нульовим залишком.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "Видалити можна лише рахунок без проводок.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "Залишки не обчислюються",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "Підсумки за період:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "Інші",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "Підсумки:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "У вашій книзі нічого не змінилося. Спробуйте ще раз або поверніться за хвилину.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "із субрахунками",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "Від’ємний залишок — це ваш борг",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "Немає рахунку, у назві якого є «{query}».",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default ukAccounts;
