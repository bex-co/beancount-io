export interface TranslationEntry {
  message: string;
  description: string;
}

const jaAccounts: Record<string, TranslationEntry> = {
  "page.accounts.actionsForAccount": {
    message: "{account} の操作",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "口座",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "口座名は次のいずれかで始まる必要があります: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "ここの残高は現在のものです。期間フィルターはこのページには適用されません。",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} はすでに開設されています（{date} から）。",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} は {date} に閉鎖されています。Beancount では再度開設できません。",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "口座名",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "口座名は必須です",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "スペースや空の部分を含めず、コロンで区切った勘定科目名を入力してください",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "勘定科目名にスペースは使えません。",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "空の部分を削除してください。「::」や先頭・末尾の「:」は使えません。",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "各部分は大文字または 0〜9 の数字で始める必要があります。「{component}」はそうなっていません（例：Assets:Bank）。",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "「{component}」に使えるのは文字、数字、ハイフンだけです。",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
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
  "page.accounts.balanceNotComputed": {
    message: "未計算",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
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
    message: "ポスティング",
    description: "Table column header for posting count",
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
  "page.accounts.accountClosedToast": {
    message: "口座 {account} を閉鎖しました",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "アカウント {account} が削除されました",
    description: "Toast shown after deleting an account",
  },
};

export default jaAccounts;
