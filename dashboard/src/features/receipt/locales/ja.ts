import type { TranslationEntry } from "@/i18n";

const jaReceipt: Record<string, TranslationEntry> = {
  "receipt.page.title": {
    message: "レシートをアップロード",
    description: "Page title for the receipt upload page",
  },
  "receipt.page.description": {
    message: "レシートの画像またはPDFをアップロードして元帳に取引を記録する",
    description: "Page description for the receipt upload page",
  },
  "receipt.page.parsing": {
    message: "AIでレシートを分析中...",
    description: "Loading message while AI parses the receipt",
  },
  "receipt.page.parsingHint": {
    message: "最大30秒かかる場合があります。",
    description: "Hint text shown while AI is parsing the receipt",
  },
  "receipt.page.errorTitle": {
    message: "エラーが発生しました",
    description: "Alert title shown when an error occurs",
  },
  "receipt.page.tryAgain": {
    message: "再試行",
    description: "Button text to retry after an error",
  },
  "receipt.upload.fileTooLarge": {
    message: "ファイルが大きすぎます。最大サイズは5MBです。",
    description: "Validation error when uploaded file exceeds 5MB size limit",
  },
  "receipt.upload.unsupportedType": {
    message:
      "サポートされていないファイル形式です。PDF、PNG、JPG、JPEG、またはWebPをアップロードしてください。",
    description: "Validation error when file type is not supported",
  },
  "receipt.upload.uploading": {
    message: "アップロード中...",
    description: "Status text shown while file is being uploaded",
  },
  "receipt.upload.chooseDifferentFile": {
    message: "別のファイルを選択",
    description: "Button text to replace the currently selected file",
  },
  "receipt.upload.dragAndDrop": {
    message: "レシートをここにドラッグ＆ドロップ",
    description: "Instruction text in the drag-and-drop upload zone",
  },
  "receipt.upload.supports": {
    message: "PDF、PNG、JPG、JPEG、WebP対応 — 最大5MB",
    description: "Hint text showing supported file formats and size limit",
  },
  "receipt.upload.chooseFile": {
    message: "ファイルを選択",
    description: "Button text to open the file picker",
  },
  "receipt.review.dateRequired": {
    message: "日付は必須です",
    description: "Validation error when date field is empty",
  },
  "receipt.review.payeeRequired": {
    message: "支払先は必須です",
    description: "Validation error when payee field is empty",
  },
  "receipt.review.descriptionRequired": {
    message: "説明は必須です",
    description: "Validation error when description field is empty",
  },
  "receipt.review.amountPositive": {
    message: "金額は正の数である必要があります",
    description: "Validation error when amount is not a positive number",
  },
  "receipt.review.currencyRequired": {
    message: "通貨は必須です",
    description: "Validation error when currency field is empty",
  },
  "receipt.review.expenseAccountRequired": {
    message: "経費口座は必須です",
    description: "Validation error when expense account is not selected",
  },
  "receipt.review.paymentAccountRequired": {
    message: "支払い口座は必須です",
    description: "Validation error when payment account is not selected",
  },
  "receipt.review.documentAccountRequired": {
    message: "ドキュメント口座は必須です",
    description: "Validation error when document account is not selected",
  },
  "receipt.review.receiptDetails": {
    message: "レシートの詳細",
    description: "Card title for the receipt details section",
  },
  "receipt.review.date": {
    message: "日付",
    description: "Label for the date field",
  },
  "receipt.review.payee": {
    message: "支払先",
    description: "Label for the payee field",
  },
  "receipt.review.merchantName": {
    message: "店舗名",
    description: "Placeholder for the payee input field",
  },
  "receipt.review.description": {
    message: "説明",
    description: "Label for the description field",
  },
  "receipt.review.transactionDescription": {
    message: "取引の説明",
    description: "Placeholder for the description input field",
  },
  "receipt.review.amount": {
    message: "金額",
    description: "Label for the amount field",
  },
  "receipt.review.currency": {
    message: "通貨",
    description: "Label for the currency field",
  },
  "receipt.review.accounts": {
    message: "口座",
    description: "Card title for the accounts section",
  },
  "receipt.review.expenseAccount": {
    message: "経費口座",
    description: "Label for the expense account field",
  },
  "receipt.review.selectExpenseAccount": {
    message: "経費口座を選択",
    description: "Placeholder for the expense account combobox",
  },
  "receipt.review.paymentAccount": {
    message: "支払い口座",
    description: "Label for the payment account field",
  },
  "receipt.review.selectPaymentAccount": {
    message: "支払い口座を選択",
    description: "Placeholder for the payment account combobox",
  },
  "receipt.review.documentAccount": {
    message: "ドキュメント口座",
    description: "Label for the document account field",
  },
  "receipt.review.selectDocumentAccount": {
    message: "ドキュメント口座を選択",
    description: "Placeholder for the document account combobox",
  },
  "receipt.review.preview": {
    message: "プレビュー",
    description: "Card title for the Beancount transaction preview",
  },
  "receipt.review.uploadDifferentReceipt": {
    message: "別のレシートをアップロード",
    description: "Button text to go back and upload a different receipt",
  },
  "receipt.review.recordTransaction": {
    message: "取引を記録",
    description: "Submit button text to record the transaction",
  },
  "receipt.success.title": {
    message: "取引が記録されました",
    description: "Heading shown after transaction is successfully recorded",
  },
  "receipt.success.description": {
    message: "レシートが元帳に保存されました。",
    description: "Description shown after transaction is successfully recorded",
  },
  "receipt.success.payee": {
    message: "支払先",
    description: "Label for payee in the success summary",
  },
  "receipt.success.date": {
    message: "日付",
    description: "Label for date in the success summary",
  },
  "receipt.success.amount": {
    message: "金額",
    description: "Label for amount in the success summary",
  },
  "receipt.success.expense": {
    message: "経費",
    description: "Label for expense account in the success summary",
  },
  "receipt.success.payment": {
    message: "支払い",
    description: "Label for payment account in the success summary",
  },
  "receipt.success.viewJournal": {
    message: "仕訳帳を表示",
    description: "Button text to navigate to the journal after success",
  },
  "receipt.success.uploadAnother": {
    message: "別のレシートをアップロード",
    description: "Button text to upload another receipt after success",
  },
  "receipt.workflow.failedToParse": {
    message: "レシートの解析に失敗しました",
    description: "Error message when AI fails to parse the receipt",
  },
  "receipt.workflow.failedToProcess": {
    message: "レシートの処理に失敗しました",
    description: "Generic fallback error message during receipt processing",
  },
  "receipt.workflow.failedToRecord": {
    message: "レシート取引の記録に失敗しました",
    description: "Error message when recording the transaction fails",
  },
};

export default jaReceipt;
