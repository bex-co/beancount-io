export interface TranslationEntry {
  message: string;
  description: string;
}

const zhAccounts: Record<string, TranslationEntry> = {
  "page.accounts.actionsForAccount": {
    message: "{account} 的操作",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "账户",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "账户必须以以下之一开头：{prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message: "此处显示的是当前余额。时间筛选不适用于此页面。",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} 已开立（自 {date} 起）。",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message: "{account} 已于 {date} 关闭，Beancount 不允许重新开立。",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "账户名称",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "账户名称为必填项",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message: "请使用冒号分隔的账户组件，不要包含空格或空段",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "账户名称不能包含空格。",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message: "请删除空的部分：不能有“::”，开头或结尾也不能有“:”。",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "每一部分都必须以大写字母或数字 0–9 开头，“{component}”不符合（例如 Assets:Bank）。",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "“{component}”只能包含字母、数字和连字符。",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
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
  "page.accounts.balanceNotComputed": {
    message: "未计算",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
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
    message: "过账",
    description: "Table column header for posting count",
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
  "page.accounts.searchAccounts": {
    message: "搜索账户...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "状态",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "类型",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "账户 {account} 已关闭",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "帐户 {account} 已删除",
    description: "Toast shown after deleting an account",
  },
};

export default zhAccounts;
