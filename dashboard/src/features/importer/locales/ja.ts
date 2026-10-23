import type { TranslationEntry } from "@/i18n";

const jaImporter: Record<string, TranslationEntry> = {
  "importer.access.signedOut": {
    message: "ログインすると、この台帳に取引をインポートできます。",
    description: "Explanation when a signed-out visitor opens the importer",
  },
  "importer.access.title": {
    message: "インポートできません",
    description: "Title when the importer cannot be used",
  },
  "importer.access.readOnly": {
    message:
      "この台帳へのアクセスは読み取り専用です。取引のインポートには書き込み権限が必要です。仕訳帳、ファイル、クエリは引き続き閲覧できます。",
    description: "Explanation when the user cannot write to the ledger",
  },
  "importer.access.unresolved": {
    message:
      "書き込み権限を確認できませんでした。台帳の権限が確認されるまでインポートは利用できません。",
    description: "Explanation when ledger write permissions are unavailable",
  },
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message:
      "このファイルは10MBの制限を超えています。小さいファイルをお試しください。",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "このファイル形式はサポートされていません。CSV、PDF、OFX、または画像ファイル（PNG、JPG）を使用してください。",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "ファイルを読み込み中\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "別のファイルを選択",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "ここにファイルをドロップしてください",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "CSV、PDF、OFX、および最大10MBの画像ファイルに対応",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "ファイルを参照",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "CSV形式の参考",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "日付（YYYY-MM-DD）、支払先、説明、金額の列を使用してください。負の値は支出を表します。",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDF、OFXファイル、画像はAIで自動的に解析されます \u2014 手動フォーマット不要。",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "ファイル形式を検出中...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "デバイスでCSVを解析中...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "AIで処理中（5〜15秒かかる場合があります）...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "処理中...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "AIを使用してファイルからトランザクションデータを抽出しています",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "標準CSV形式の高速ローカル処理",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "別のファイルをアップロード",
    description: "Button to upload a different file after error",
  },
  "importer.aiOffer.title": {
    message: "この CSV の列を読み取れませんでした",
    description:
      "Title when a CSV's columns could not be read by the free client parser",
  },
  "importer.aiOffer.description": {
    message:
      "スマートインポートは、日付・支払先・説明・金額の列がある CSV ファイルを無料で読み取ります。このファイルは AI で読み取ることもでき、その場合は AI トークンを使用します。",
    description:
      "Explains the free CSV format and that AI parsing spends AI tokens",
  },
  "importer.aiOffer.parseWithAi": {
    message: "AI で解析（AI トークンを使用）",
    description:
      "Button that parses the unreadable CSV with AI, spending AI tokens",
  },
  "importer.error.aiQuotaReached": {
    message: "今月の AI トークンを使い切りました",
    description:
      "Title when AI parsing of a CSV is refused because the month's AI tokens are used up",
  },
  "importer.error.aiQuotaReachedCsv": {
    message:
      "AI 解析は来月、または Premium で再び利用できます。日付・支払先・説明・金額の列がある CSV は引き続き無料でインポートできます。",
    description:
      "Explains when AI parsing returns and that a well-formed CSV still imports for free",
  },
  "importer.error.premiumRequired": {
    message: "プレミアム機能が必要です",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "現在のファイル形式にはAI解析が必要です",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPlan": {
    message: "{plan}にアップグレード",
    description:
      "Heading over the paywall's upgrade button; {plan} is the plan the button recommends (the next tier up).",
  },
  "importer.error.upgradePlan": {
    message: "プランをアップグレード",
    description:
      "Heading over the paywall's upgrade button when no higher self-serve plan exists.",
  },
  "importer.error.upgradeDescription": {
    message: "AIでPDF、OFX、画像ファイルを自動解析",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "今すぐアップグレード",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "または",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "CSV形式を使用",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "CSVファイルはプレミアムなしで無料で解析できます",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "CSVサンプルをダウンロード",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "ファイルの解析に失敗しました",
    description: "Title for parse failure error",
  },
  "importer.error.notUtf8": {
    message: "ファイルが UTF-8 テキストではありません",
    description: "Title when an uploaded CSV is not UTF-8 text",
  },
  "importer.error.notUtf8Description": {
    message:
      "この CSV には有効な UTF-8 ではない文字が含まれているため、インポートすると支払先や説明のテキストが変わってしまいます。銀行または表計算アプリで CSV UTF-8 として保存し直し、そのファイルをアップロードしてください。",
    description: "How to re-save a CSV that is not UTF-8 text",
  },
  "importer.error.serverError": {
    message:
      "ファイルの処理中にサーバーエラーが発生しました。数秒後にもう一度お試しください。",
    description: "Description of server error",
  },

  // Preview Table
  "importer.preview.title": {
    message: "インポートデータのプレビュー",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message:
      "勘定科目を設定する前に解析されたトランザクションを確認してください",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "有効",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "エラー",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "行",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "日付",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "支払先",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "説明",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "金額",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "表示するデータがありません",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "検証エラーが見つかりました",
    description: "Alert title for validation errors",
  },
  "importer.preview.recordWidthError": {
    message:
      "このレコードの項目数が4つ（日付、支払先、説明、金額）ではありません。行を削除するか、ファイルを修正してもう一度アップロードしてください。",
    description:
      "Shown on a preview row whose CSV record has more or fewer than the four importer fields; editing its cells cannot fix it",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "一部の行に検証エラーがあります。続行する前に修正してください。修正しない場合、インポート時にスキップされます。",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "別のファイルをアップロード",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "設定に進む",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "YYYY-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "支払先名",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "説明",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "クリックして編集",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.multilineHint": {
    message: "Enter で保存、Shift+Enter で改行します。",
    description:
      "Hint under a multiline editable cell explaining the commit shortcut",
  },
  "importer.preview.actions": {
    message: "操作",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "{row} 行目を削除",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "トランザクションが見つかりません",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "ファイルは正常に解析されましたが、トランザクションデータが見つかりませんでした。ファイルを確認してもう一度お試しください。",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "別のファイルを試す",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "インポート設定を構成",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "すべてのトランザクションのソース口座と通貨を設定し、各行にターゲット口座を割り当てます",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "ソース口座",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "ソース口座を選択...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "これらのトランザクションが発生した銀行口座",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "通貨",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "すべてのトランザクションの通貨",
    description: "Hint text for currency field",
  },
  "importer.configure.currencyConflict_other": {
    message:
      "{count} 行（{rows}）は {symbol}（{currencies}）で記載されていますが、このインポートでは {currency} として記帳されます。",
    description:
      "Import refusal for several selected rows whose amounts carry a currency symbol other than the chosen import currency. {rows} lists their row numbers, possibly ending in …",
  },
  "importer.configure.currencyConflictRemedy": {
    message:
      "1 回のインポートで記帳できる通貨は 1 つです。これらの行の通貨を選択するか、選択を解除して別にインポートしてください。まだ何もインポートされていません。",
    description:
      "How to resolve a currency conflict before importing: no conversion happens, so the user picks the matching currency or splits the file",
  },
  "importer.configure.assignTargetAccounts": {
    message: "ターゲット口座を割り当て",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "戻る",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "インポート中...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "{count}件のトランザクションをインポート",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_other": {
    message: "{count}件のトランザクションをインポート",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "ソース口座は必須です",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "通貨は必須です",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "少なくとも1件のトランザクションが必要です",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "選択されたすべてのトランザクションにターゲット口座が必要です",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "少なくとも1件のトランザクションを選択する必要があります",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "説明で検索...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "金額でフィルター",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "すべての金額",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "プラスのみ",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "マイナスのみ",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "表示中の行をすべて選択",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "ターゲット口座",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "カテゴリ分類中...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "AI自動入力",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "フィルターに一致するトランザクションがありません",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "設定するトランザクションがありません",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "トランザクションを選択",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "口座を選択...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "選択された行に必須",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count}件のトランザクションにターゲット口座が不足しています。インポート前に選択されたすべての行にターゲット口座を割り当ててください。",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count}件のトランザクションにターゲット口座が不足しています。インポート前に選択されたすべての行にターゲット口座を割り当ててください。",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "AIカテゴリ分類完了！",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count}件のトランザクションを正常にカテゴリ分類しました",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count}件のトランザクションを正常にカテゴリ分類しました",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiNoneApplied": {
    message: "対象勘定を入力できるほど確度の高い提案はありませんでした。",
    description:
      "Toast description when AI Fill completed but no suggestion was confident enough to fill a target",
  },
  "importer.accountMapping.aiFailed": {
    message: "AIカテゴリ分類に失敗しました",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "トランザクションをインポート中...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message: "台帳にトランザクションを追加しています。しばらくお待ちください",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "インポート成功！",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count}件のトランザクションを正常にインポートしました",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_other": {
    message: "{count}件のトランザクションを正常にインポートしました",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count}件のトランザクションのインポートに失敗しました",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_other": {
    message: "{count}件のトランザクションのインポートに失敗しました",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "ジャーナルを表示",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "さらにインポート",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "失敗したトランザクション：",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "行",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.failedTitle": {
    message: "インポート失敗",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "トランザクションのインポート中にエラーが発生しました",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "エラーの詳細：",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "最初からやり直す",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "スマートインポート",
    description: "Page title for the importer page",
  },
  "importer.finish.note": {
    message: "注",
    description: "Label before a partial import note",
  },
  "importer.finish.andMoreErrors": {
    message: "…さらに {count} 件のエラー",
    description: "Count of additional import errors",
  },
  "importer.preview.editCellLabel": {
    message: "{field}（{row} 行目）を編集します。現在の値: {value}",
    description: "Accessible label for an editable import cell",
  },
  "importer.preview.editFieldLabel": {
    message: "{field}、{row} 行目",
    description: "Accessible label for the open editor of an import cell",
  },
  "importer.validation.dateRequired": {
    message: "日付は必須です",
    description: "Validation error for a missing import date",
  },
  "importer.validation.invalidDateFormat": {
    message: "無効な日付形式です。 YYYY-MM-DD予定",
    description: "Validation error for an invalid import date",
  },
  "importer.validation.payeeRequired": {
    message: "受取人は必須です",
    description: "Validation error for a missing import payee",
  },
  "importer.validation.descriptionRequired": {
    message: "説明は必須です",
    description: "Validation error for a missing import description",
  },
  "importer.validation.amountRequired": {
    message: "金額が必要です",
    description: "Validation error for a missing import amount",
  },
  "importer.validation.amountInvalid": {
    message: "金額は有効な数値でなければなりません",
    description: "Validation error for an invalid import amount",
  },
  "importer.validation.amountMixedDecimals": {
    message:
      "この列には小数点がピリオドの値（1,234.56）とカンマの値（1.234,56）が混在しています。列ごとに 1 つの表記に揃えてください。",
    description:
      "Validation error when an import amount column mixes point and comma decimal marks",
  },
  "importer.validation.amountUnsupportedPrecision": {
    message:
      "この金額は正確にインポートできません。すべての桁が保たれるよう短くしてください",
    description:
      "Validation error when Number conversion would change the exact decimal value",
  },
};

export default jaImporter;
