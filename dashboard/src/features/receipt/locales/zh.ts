export interface TranslationEntry {
  message: string;
  description: string;
}

const zhReceipt: Record<string, TranslationEntry> = {
  // Page
  "receipt.page.title": {
    message: "上传收据",
    description: "Page title for the receipt upload page",
  },
  "receipt.page.description": {
    message: "上传收据图片或 PDF，将交易记录到你的账本",
    description: "Page description for the receipt upload page",
  },
  "receipt.page.parsing": {
    message: "AI 正在分析收据...",
    description: "Loading message while AI parses the receipt",
  },
  "receipt.page.parsingHint": {
    message: "这可能需要最多 30 秒。",
    description: "Hint text shown while AI is parsing the receipt",
  },
  "receipt.page.errorTitle": {
    message: "出现错误",
    description: "Alert title shown when an error occurs",
  },
  "receipt.page.tryAgain": {
    message: "重试",
    description: "Button text to retry after an error",
  },

  // Upload Zone
  "receipt.upload.fileTooLarge": {
    message: "文件过大，最大支持 5MB。",
    description: "Validation error when uploaded file exceeds 5MB size limit",
  },
  "receipt.upload.unsupportedType": {
    message: "不支持的文件类型，请上传 PDF、PNG、JPG、JPEG 或 WebP 格式。",
    description: "Validation error when file type is not supported",
  },
  "receipt.upload.uploading": {
    message: "上传中...",
    description: "Status text shown while file is being uploaded",
  },
  "receipt.upload.chooseDifferentFile": {
    message: "选择其他文件",
    description: "Button text to replace the currently selected file",
  },
  "receipt.upload.dragAndDrop": {
    message: "将收据拖放到此处",
    description: "Instruction text in the drag-and-drop upload zone",
  },
  "receipt.upload.supports": {
    message: "支持 PDF、PNG、JPG、JPEG、WebP — 最大 5MB",
    description: "Hint text showing supported file formats and size limit",
  },
  "receipt.upload.chooseFile": {
    message: "选择文件",
    description: "Button text to open the file picker",
  },

  // Review Form — validation messages
  "receipt.review.dateRequired": {
    message: "日期不能为空",
    description: "Validation error when date field is empty",
  },
  "receipt.review.payeeRequired": {
    message: "收款方不能为空",
    description: "Validation error when payee field is empty",
  },
  "receipt.review.descriptionRequired": {
    message: "描述不能为空",
    description: "Validation error when description field is empty",
  },
  "receipt.review.amountPositive": {
    message: "金额必须为正数",
    description: "Validation error when amount is not a positive number",
  },
  "receipt.review.currencyRequired": {
    message: "货币不能为空",
    description: "Validation error when currency field is empty",
  },
  "receipt.review.expenseAccountRequired": {
    message: "费用账户不能为空",
    description: "Validation error when expense account is not selected",
  },
  "receipt.review.paymentAccountRequired": {
    message: "付款账户不能为空",
    description: "Validation error when payment account is not selected",
  },
  "receipt.review.documentAccountRequired": {
    message: "凭证账户不能为空",
    description: "Validation error when document account is not selected",
  },

  // Review Form — labels and placeholders
  "receipt.review.receiptDetails": {
    message: "收据详情",
    description: "Card title for the receipt details section",
  },
  "receipt.review.date": {
    message: "日期",
    description: "Label for the date field",
  },
  "receipt.review.payee": {
    message: "收款方",
    description: "Label for the payee field",
  },
  "receipt.review.merchantName": {
    message: "商家名称",
    description: "Placeholder for the payee input field",
  },
  "receipt.review.description": {
    message: "描述",
    description: "Label for the description field",
  },
  "receipt.review.transactionDescription": {
    message: "交易描述",
    description: "Placeholder for the description input field",
  },
  "receipt.review.amount": {
    message: "金额",
    description: "Label for the amount field",
  },
  "receipt.review.currency": {
    message: "货币",
    description: "Label for the currency field",
  },
  "receipt.review.accounts": {
    message: "账户",
    description: "Card title for the accounts section",
  },
  "receipt.review.expenseAccount": {
    message: "费用账户",
    description: "Label for the expense account field",
  },
  "receipt.review.selectExpenseAccount": {
    message: "选择费用账户",
    description: "Placeholder for the expense account combobox",
  },
  "receipt.review.paymentAccount": {
    message: "付款账户",
    description: "Label for the payment account field",
  },
  "receipt.review.selectPaymentAccount": {
    message: "选择付款账户",
    description: "Placeholder for the payment account combobox",
  },
  "receipt.review.documentAccount": {
    message: "凭证账户",
    description: "Label for the document account field",
  },
  "receipt.review.selectDocumentAccount": {
    message: "选择凭证账户",
    description: "Placeholder for the document account combobox",
  },
  "receipt.review.preview": {
    message: "预览",
    description: "Card title for the Beancount transaction preview",
  },
  "receipt.review.uploadDifferentReceipt": {
    message: "上传其他收据",
    description: "Button text to go back and upload a different receipt",
  },
  "receipt.review.recordTransaction": {
    message: "记录交易",
    description: "Submit button text to record the transaction",
  },

  // Success Card
  "receipt.success.title": {
    message: "交易已记录",
    description: "Heading shown after transaction is successfully recorded",
  },
  "receipt.success.description": {
    message: "你的收据已保存到账本。",
    description: "Description shown after transaction is successfully recorded",
  },
  "receipt.success.payee": {
    message: "收款方",
    description: "Label for payee in the success summary",
  },
  "receipt.success.date": {
    message: "日期",
    description: "Label for date in the success summary",
  },
  "receipt.success.amount": {
    message: "金额",
    description: "Label for amount in the success summary",
  },
  "receipt.success.expense": {
    message: "费用",
    description: "Label for expense account in the success summary",
  },
  "receipt.success.payment": {
    message: "付款",
    description: "Label for payment account in the success summary",
  },
  "receipt.success.viewJournal": {
    message: "查看日记账",
    description: "Button text to navigate to the journal after success",
  },
  "receipt.success.uploadAnother": {
    message: "上传其他收据",
    description: "Button text to upload another receipt after success",
  },

  // Workflow error messages
  "receipt.workflow.failedToParse": {
    message: "收据解析失败",
    description: "Error message when AI fails to parse the receipt",
  },
  "receipt.workflow.failedToProcess": {
    message: "收据处理失败",
    description: "Generic fallback error message during receipt processing",
  },
  "receipt.workflow.failedToRecord": {
    message: "记录收据交易失败",
    description: "Error message when recording the transaction fails",
  },
};

export default zhReceipt;
