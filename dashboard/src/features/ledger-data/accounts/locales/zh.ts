export interface TranslationEntry {
  message: string;
  description: string;
}

const zhAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "账户",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "账户必须以以下之一开头：{prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "账户名称",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "账户名称为必填项",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "账户",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "在 {ledgerName} 中的所有 beancount 账户",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "所有类型",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "余额",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "关闭",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "关闭账户",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "这将为 {account} 在 {date} 添加关闭指令。",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "关闭日期",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "已关闭",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "删除账户",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "这将永久删除 {account} 的开启指令。",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message: "这将永久删除 {account} 的开启和关闭指令。",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "条目",
    description: "Table column header for entry count",
  },
  "page.accounts.failedToLoadAccounts": {
    message: "加载账户失败",
    description: "Error message when accounts fail to load",
  },
  "page.accounts.loadingAccounts": {
    message: "加载账户中...",
    description: "Loading message when fetching accounts",
  },
  "page.accounts.loadingEntryContent": {
    message: "加载条目内容中...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "新建",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "未找到账户",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "没有账户符合当前的筛选条件。",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "开启",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "开启账户",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "开启日期",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.operation": {
    message: "操作",
    description: "Table column header for available operations on an account",
  },
  "page.accounts.searchAccounts": {
    message: "搜索账户...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "状态",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
};

export default zhAccounts;
