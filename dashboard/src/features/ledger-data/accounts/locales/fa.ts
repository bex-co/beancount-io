export interface TranslationEntry {
  message: string;
  description: string;
}

const faAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "حساب",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "حساب باید با یکی از این‌ها شروع شود: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "نام حساب",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "نام حساب الزامی است",
    description: "Validation error when account name field is empty",
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
  "page.accounts.allAccountsIn": {
    message: "همه حساب‌های beancount در {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "همه انواع",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "موجودی",
    description: "Table column header for account balance",
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
  "page.accounts.closeDate": {
    message: "تاریخ بستن",
    description: "Table column header for account close date",
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
    message: "ورودی‌ها",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "در حال بارگذاری محتوای ورودی...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "جدید",
    description: "Button text to create a new account",
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
  "page.accounts.status": {
    message: "وضعیت",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "حساب {account} بسته شد",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
};

export default faAccounts;
