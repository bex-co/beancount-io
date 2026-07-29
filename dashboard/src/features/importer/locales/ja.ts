import type { TranslationEntry } from "@/i18n";

const jaImporter: Record<string, TranslationEntry> = {
  // Premium Banner
  "importer.premiumBannerTitle": {
    message: "スマートインポートが利用可能 — 早期アクセス無料",
    description: "Title for premium feature banner",
  },
  "importer.premiumBannerDismiss": {
    message: "バナーを閉じる",
    description: "Aria label for dismiss banner button",
  },
  "importer.premiumBannerDescription": {
    message:
      "AIによる解析でPDF、OFXファイル、画像から銀行明細を数秒でインポート。期間限定無料。",
    description: "Description of premium importer features",
  },

  // File Upload
  "importer.upload.title": {
    message: "ファイルをアップロード",
    description: "Title for file upload card",
  },
  "importer.upload.description": {
    message:
      "銀行明細またはトランザクションファイルをアップロードしてください。対応形式：CSV、PDF、OFX、または画像（PNG/JPG）。最大10MB。",
    description: "Description of supported file formats and size limit",
  },
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
  "importer.upload.fileSize": {
    message: "{size} KB",
    description: "Display file size in KB",
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
  "importer.error.premiumRequired": {
    message: "プレミアム機能が必要です",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "現在のファイル形式にはAI解析が必要です",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "プレミアムにアップグレード",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "AIでPDF、OFX、画像ファイルを自動解析",
    description: "Description of premium parsing features",
  },
  "importer.error.processing": {
    message: "処理中...",
    description: "Button text while processing upgrade",
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
  "importer.preview.status": {
    message: "ステータス",
    description: "Table header for status column",
  },
  "importer.preview.noData": {
    message: "表示するデータがありません",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "検証エラーが見つかりました",
    description: "Alert title for validation errors",
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
  "importer.preview.errorStatus": {
    message: "エラー",
    description: "Status label for invalid rows",
  },
  "importer.preview.validStatus": {
    message: "有効",
    description: "Status label for valid rows",
  },
  "importer.preview.actions": {
    message: "操作",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "行を削除",
    description: "Aria label for delete row button",
  },
  "importer.preview.rowDeleted": {
    message: "行が削除されました",
    description: "Toast message when row is deleted",
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
  "importer.preview.emptyFileHint": {
    message:
      "ファイルに正しい形式のトランザクションデータが含まれていることを確認してください。",
    description: "Hint for empty file state",
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
  "importer.configure.importButton_one": {
    message: "{count}件のトランザクションをインポート",
    description: "Button text to import single transaction with count",
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
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count}件のトランザクションにターゲット口座が不足しています。インポート前に選択されたすべての行にターゲット口座を割り当ててください。",
    description: "Alert message for single transaction missing target account",
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
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count}件のトランザクションを正常にカテゴリ分類しました",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count}件のトランザクションを正常にカテゴリ分類しました",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "AIカテゴリ分類に失敗しました",
    description: "Toast title for failed AI categorization",
  },
  "importer.accountMapping.aiFailedDescription": {
    message: "カテゴリ分類に失敗しました",
    description:
      "Toast description for failed AI categorization (will be replaced with actual error)",
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
  "importer.finish.successMessage_one": {
    message: "{count}件のトランザクションを正常にインポートしました",
    description: "Success message for single transaction with count",
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
  "importer.finish.partialFailure_one": {
    message: "{count}件のトランザクションのインポートに失敗しました",
    description: "Partial failure message for single transaction",
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
  "importer.finish.moreErrors": {
    message: "件のエラーがあります",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
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
};

export default jaImporter;
