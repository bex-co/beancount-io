export interface TranslationEntry {
  message: string;
  description: string;
}

const koAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "계정 닫기 지시문의 소스",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "계정 열기 지시문의 소스",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "{account} 작업",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "계정",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "{root} 뒤에 이름을 추가하세요. 예를 들면 {example}입니다.",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
  },
  "page.accounts.accountMustStartWith": {
    message: "계정명은 다음 중 하나로 시작해야 합니다: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "여기의 잔액은 현재 잔액입니다. 기간 필터는 이 페이지에 적용되지 않습니다.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} 계정은 이미 열려 있습니다({date}부터).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} 계정은 {date}에 닫혔으며 Beancount에서는 다시 열 수 없습니다.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "계정명",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "계정명은 필수입니다",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message: "공백이나 빈 부분 없이 콜론으로 구분된 계정 구성요소를 사용하세요",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "계정 이름에는 공백을 사용할 수 없습니다.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message: "빈 부분을 제거하세요. “::”이나 앞뒤의 “:”는 사용할 수 없습니다.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "각 부분은 대문자나 0~9 숫자로 시작해야 합니다. “{component}”은(는) 그렇지 않습니다(예: Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "“{component}”에는 문자, 숫자, 하이픈만 사용할 수 있습니다.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "계정:하위계정",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "계정",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allTypes": {
    message: "모든 유형",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "잔액",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "계산되지 않음",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
  },
  "page.accounts.close": {
    message: "닫기",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "계정 폐쇄",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "{date}에 {account}의 폐쇄 지시문을 추가합니다.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closed": {
    message: "폐쇄됨",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "계정 삭제",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "{account}의 개설 지시문을 영구적으로 삭제합니다.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message: "{account}의 개설 및 폐쇄 지시문을 영구적으로 삭제합니다.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "게시",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "항목 내용 불러오는 중...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.noAccountsFound": {
    message: "계정을 찾을 수 없습니다",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "현재 필터에 맞는 계정이 없습니다.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "개설",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "계정 개설",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "개설일",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "계정 검색...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.type": {
    message: "유형",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "{account} 계정이 폐쇄되었습니다",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "계정 {account} 삭제됨",
    description: "Toast shown after deleting an account",
  },
  "page.accounts.accountCount_other": {
    message: "계정 {shown}개",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "계정 원장 열기",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "잔액이 0인 계정만 닫을 수 있습니다.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "게시가 없는 계정만 삭제할 수 있습니다.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "잔액은 계산되지 않음",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "기간별 합계:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "기타",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "합계:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "원장은 변경되지 않았습니다. 다시 시도하거나 잠시 후 다시 열어 주세요.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "하위 계정 포함",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "음수 잔액은 갚아야 할 금액입니다",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "'{query}'이(가) 포함된 계정 이름이 없습니다.",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default koAccounts;
