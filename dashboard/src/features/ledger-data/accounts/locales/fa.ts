export interface TranslationEntry {
  message: string;
  description: string;
}

const faAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "متن دستور بستن حساب",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "متن دستور باز کردن حساب",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "عملیات برای {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "حساب",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "بعد از {root} یک نام اضافه کنید، مانند {example}.",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
  },
  "page.accounts.accountMustStartWith": {
    message: "حساب باید با یکی از این‌ها شروع شود: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "مانده‌های اینجا فعلی هستند. فیلتر زمان روی این صفحه اعمال نمی‌شود.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} از قبل باز است (از {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} در {date} بسته شده است؛ Beancount اجازهٔ بازکردن دوبارهٔ آن را نمی‌دهد.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "نام حساب",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "نام حساب الزامی است",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "از اجزای حساب جداشده با دونقطه بدون فاصله یا بخش خالی استفاده کنید",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "نام حساب نمی‌تواند فاصله داشته باشد.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message: "بخش خالی را حذف کنید: بدون «::» و بدون «:» در ابتدا یا انتها.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "هر بخش باید با حرف بزرگ یا رقم 0 تا 9 شروع شود — «{component}» این‌طور نیست (برای نمونه Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "«{component}» فقط می‌تواند حرف، رقم و خط تیره داشته باشد.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "حساب‌ها",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allTypes": {
    message: "همه انواع",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "موجودی",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "محاسبه نشده",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
  },
  "page.accounts.close": {
    message: "بستن",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "بستن حساب",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "این یک دستور بستن برای {account} در تاریخ {date} اضافه می‌کند.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closed": {
    message: "بسته",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "حذف حساب",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "این دستور باز کردن {account} را به طور دائمی حذف می‌کند.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "این دستورات باز کردن و بستن {account} را به طور دائمی حذف می‌کند.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "سندها",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "در حال بارگذاری محتوای ورودی...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.noAccountsFound": {
    message: "هیچ حسابی یافت نشد",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "هیچ حسابی با فیلترهای فعلی شما مطابقت ندارد.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "باز",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "باز کردن حساب",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "تاریخ باز کردن",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "جستجوی حساب‌ها...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.type": {
    message: "نوع",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "حساب {account} بسته شد",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "حساب {account} حذف شد",
    description: "Toast shown after deleting an account",
  },
  "page.accounts.accountCount_one": {
    message: "{shown} حساب",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_other": {
    message: "{shown} حساب",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "باز کردن دفتر حساب",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "فقط حسابی با مانده صفر را می‌توان بست.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.closeInLedgerFile": {
    message:
      "در این صفحه فقط می‌توان حساب‌های دارایی و بدهی را بست. برای بستن این حساب، دستور {directive} را به فایل دفتر حساب اضافه کنید.",
    description:
      "Why the Close action is unavailable for an account with no computed balance. {directive} is the literal Beancount close keyword.",
  },
  "page.accounts.deleteNeedsNoReferences": {
    message: "حساب فقط زمانی حذف می‌شود که هیچ ثبت دیگری به آن ارجاع ندهد.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "مانده‌ها محاسبه نمی‌شوند",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "جمع‌ها به تفکیک دوره:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "سایر",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "جمع‌ها:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "در دفتر شما چیزی تغییر نکرده است. دوباره امتحان کنید یا یک دقیقه دیگر برگردید.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "با زیرحساب‌ها",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "مانده منفی یعنی بدهی شما",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "هیچ نام حسابی شامل «{query}» نیست.",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default faAccounts;
