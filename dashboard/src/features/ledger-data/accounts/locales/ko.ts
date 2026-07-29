export interface TranslationEntry {
  message: string;
  description: string;
}

const koAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "계정",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "계정명은 다음 중 하나로 시작해야 합니다: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "계정명",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "계정명은 필수입니다",
    description: "Validation error when account name field is empty",
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
  "page.accounts.allAccountsIn": {
    message: "{ledgerName}의 모든 복식부기 계정",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "모든 유형",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "잔액",
    description: "Table column header for account balance",
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
  "page.accounts.closeDate": {
    message: "폐쇄일",
    description: "Table column header for account close date",
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
    message: "항목",
    description: "Table column header for entry count",
  },
  "page.accounts.failedToLoadAccounts": {
    message: "계정 불러오기 실패",
    description: "Error message when accounts fail to load",
  },
  "page.accounts.loadingAccounts": {
    message: "계정 불러오는 중...",
    description: "Loading message when fetching accounts",
  },
  "page.accounts.loadingEntryContent": {
    message: "항목 내용 불러오는 중...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "새로 만들기",
    description: "Button text to create a new account",
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
  "page.accounts.operation": {
    message: "작업",
    description: "Table column header for available operations on an account",
  },
  "page.accounts.searchAccounts": {
    message: "계정 검색...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "상태",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "유형",
    description: "Table column header for type",
  },
};

export default koAccounts;
