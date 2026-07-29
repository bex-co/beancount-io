import type { TranslationEntry } from "@/i18n";

const jaJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "勘定科目",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "勘定科目選択",
    description: "Dialog or dropdown title for selecting account",
  },
  "journal.accountPlaceholder": {
    message: "勘定科目（例：Assets:Bank:Checking）",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "勘定科目は必須です",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "勘定科目",
    description: "Plural form of account",
  },
  "journal.accountsPlural": {
    message: "勘定科目",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "新しいジャーナルエントリを追加",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "ポスティングを追加",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "取引を追加",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "金額を入力してください",
    description: "Validation error when amount is not provided",
  },
  "journal.amountMustBeNumber": {
    message: "金額は有効な数値でなければなりません",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "金額（例：100.00）",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "金額は必須です",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastOnePosting": {
    message: "少なくとも1つのポスティングが必要です",
    description: "Validation error when no postings exist",
  },
  "journal.atLeastTwoPostings": {
    message: "少なくとも2つのポスティングが必要です",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "残高",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "残高",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "エントリ後の残高",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "エントリ前の残高",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "予算エントリ",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "変更",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "決済済み取引",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "クローズ",
    description: "Close account entry type filter",
  },
  "journal.closeAccount": {
    message: "勘定科目をクローズ",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "原価",
    description: "Table header for cost column",
  },
  "journal.createNewJournalEntry": {
    message: "この台帳に新しいジャーナルエントリを作成",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "勘定科目エントリを作成",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "残高エントリを作成",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "メモエントリを作成",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "取引エントリを作成",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "通貨（例：USD）",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "通貨は必須です",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "カスタム",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "日付",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "発見されたドキュメント",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "ドキュメント",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "現在のフィルタリングされたエントリをBeancountファイルとしてダウンロード",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "エントリコンテキスト",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "エントリが正常に作成されました",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "場所：",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "ジャーナルエントリの読み込みエラー",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "エクスポート",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "ジャーナルをエクスポート",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "エクスポート中...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "残高エントリの作成に失敗しました",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "メモエントリの作成に失敗しました",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "取引の作成に失敗しました",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "ジャーナルのエクスポートに失敗しました",
    description: "Error message when journal export fails",
  },
  "journal.flagPlaceholder": {
    message: "フラグ（例：*）",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "送金元",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "ジャーナル",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "ジャーナルが正常にエクスポートされました",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "ジャーナルの読み込みに失敗しました：",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message: "「取引を追加」ボタンを使用してエントリを作成",
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "Webインターフェースからbeancountファイルをアップロード",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "既存の会計データをインポート",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message: "取引を追加すると、ここに表示されます。",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "はじめに：",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "まだジャーナルエントリがありません。",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "ジャーナルへようこそ！📔",
    description: "Welcome title for empty journal page",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "リンクされたドキュメント",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "エントリコンテキストを読み込み中...",
    description: "Loading message while fetching entry context",
  },
  "journal.loadingMore": {
    message: "さらに読み込み中...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "メタデータ",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "説明",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "説明",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "説明は必須です",
    description: "Validation error when narration is missing",
  },
  "journal.newEntry": {
    message: "新しいエントリ",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "通貨が見つかりません",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "現在のフィルターに一致するジャーナルエントリが見つかりません。",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noMoreEntries": {
    message: "これ以上のエントリはありません",
    description: "Message when no more entries to load",
  },
  "journal.noNarrationsFound": {
    message: "説明が見つかりません",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "支払先が見つかりません",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "メモ",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "メモの内容",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "メモの内容は必須です",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "オープン",
    description: "Open account entry type filter",
  },
  "journal.openAccount": {
    message: "勘定科目をオープン",
    description: "Action to open a new account",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "その他の取引",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "パッド",
    description: "Pad entry type filter",
  },
  "journal.payee": {
    message: "支払先",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "支払先/説明",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "支払先",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "支払先は必須です",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "保留中の取引",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "入力してください...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "ポスティング",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "ポスティング",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "価格",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "価格",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "クイック追加",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "保存に失敗しました",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "取引が保存されました！",
    description: "Success message after saving transaction",
  },
  "journal.selectAccount": {
    message: "勘定科目を選択...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "残高日付を選択",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "通貨を選択...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "説明を選択...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "メモ日付を選択",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "支払先を選択...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.selectTransactionDate": {
    message: "取引日付を選択",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "送金先",
    description: "Label for destination account in transaction",
  },
  "journal.toggleMetadata": {
    message: "メタデータを切り替え",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "ポスティングを切り替え",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "取引",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "取引",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "単位",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "不明なディレクティブタイプ",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default jaJournal;
