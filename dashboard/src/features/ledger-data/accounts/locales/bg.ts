export interface TranslationEntry {
  message: string;
  description: string;
}

const bgAccounts: Record<string, TranslationEntry> = {
  "page.accounts.actionsForAccount": {
    message: "Действия за {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Сметка",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Сметката трябва да започва с един от: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Салдата тук са текущи. Филтърът по време не се прилага за тази страница.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} вече е открита (от {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} е закрита на {date}; Beancount не позволява повторното ѝ откриване.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Наименование на сметката",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Наименованието на сметката е задължително",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Използвайте компоненти на сметка, разделени с двоеточие, без интервали или празни части",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Имената на сметки не може да съдържат интервали.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "Премахнете празната част: без „::“ и без „:“ в началото или края.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Всяка част трябва да започва с главна буква или цифра от 0 до 9 — „{component}“ не започва така (например Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "„{component}“ може да съдържа само букви, цифри и тирета.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
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
  "page.accounts.allTypes": {
    message: "Всички типове",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Баланс",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "Не е изчислено",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
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
    message: "Проводки",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Зареждане на съдържанието на записа...",
    description: "Loading message when fetching entry content in delete dialog",
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
  "page.accounts.type": {
    message: "Тип",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Сметката {account} е затворена",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Акаунтът {account} е изтрит",
    description: "Toast shown after deleting an account",
  },
  "page.accounts.accountCount_one": {
    message: "{shown} сметка",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_other": {
    message: "{shown} сметки",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "Отвори регистъра",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "Може да се закрие само сметка с нулево салдо.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "Може да се изтрие само сметка без проводки.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "Салдата не се изчисляват",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "Суми по периоди:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "Други",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "Суми:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "В книгата ви нищо не е променено. Опитайте отново или се върнете след минута.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "със подсметките",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "Отрицателното салдо е дължимото",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "Няма сметка, чието име съдържа „{query}“.",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default bgAccounts;
