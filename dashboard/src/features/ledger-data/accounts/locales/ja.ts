export interface TranslationEntry {
  message: string;
  description: string;
}

const jaAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "口座",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "口座名は次のいずれかで始まる必要があります: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "口座名",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "口座名は必須です",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "口座:サブ口座",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "口座",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "{ledgerName}のすべての複式帳簿口座",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "すべてのタイプ",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "残高",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "閉じる",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "口座を閉鎖",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "{date}に{account}の閉鎖ディレクティブを追加します。",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "閉鎖日",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "閉鎖済み",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "口座を削除",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "{account}の開設ディレクティブを完全に削除します。",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message: "{account}の開設および閉鎖ディレクティブを完全に削除します。",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "エントリ",
    description: "Table column header for entry count",
  },
  "page.accounts.failedToLoadAccounts": {
    message: "口座の読み込みに失敗しました",
    description: "Error message when accounts fail to load",
  },
  "page.accounts.loadingAccounts": {
    message: "口座を読み込み中...",
    description: "Loading message when fetching accounts",
  },
  "page.accounts.loadingEntryContent": {
    message: "エントリコンテンツを読み込み中...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "新規",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "口座が見つかりません",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "現在のフィルターに一致する口座がありません。",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "開設",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "口座を開設",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "開設日",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.operation": {
    message: "操作",
    description: "Table column header for available operations on an account",
  },
  "page.accounts.searchAccounts": {
    message: "口座を検索...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "ステータス",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "タイプ",
    description: "Table column header for type",
  },
};

export default jaAccounts;
