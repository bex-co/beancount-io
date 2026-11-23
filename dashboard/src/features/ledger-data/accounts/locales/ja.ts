export interface TranslationEntry {
  message: string;
  description: string;
}

const jaAccounts: Record<string, TranslationEntry> = {
  "page.accounts.closeDirectiveSource": {
    message: "口座を閉じるディレクティブのソース",
    description:
      "Accessible name of the read-only source preview for the close directive",
  },
  "page.accounts.openDirectiveSource": {
    message: "口座を開くディレクティブのソース",
    description:
      "Accessible name of the read-only source preview for the open directive",
  },
  "page.accounts.actionsForAccount": {
    message: "{account} の操作",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "口座",
    description: "Table column header for account name",
  },
  "page.accounts.accountNeedsChild": {
    message: "{root} の後ろに名前を追加してください（例 {example}）。",
    description:
      "Validation error for a bare account root. {root} is the configured root and {example} is a valid full account name.",
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
  "page.accounts.accountCount_other": {
    message: "{shown} 口座",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "口座の明細を開く",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "残高がゼロの口座のみ閉鎖できます。",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "ポスティングのない口座のみ削除できます。",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "残高は未計算",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "期間ごとの合計:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "その他",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "合計:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "台帳には何も変更はありません。もう一度試すか、少し待ってから開き直してください。",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "子口座を含む",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "マイナス残高は支払うべき額です",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "「{query}」を含む口座名はありません。",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default jaAccounts;
