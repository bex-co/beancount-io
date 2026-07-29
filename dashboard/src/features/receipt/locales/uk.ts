export interface TranslationEntry {
  message: string;
  description: string;
}

const ukReceipt: Record<string, TranslationEntry> = {
  // Page
  "receipt.page.title": {
    message: "Upload Receipt",
    description: "Page title for the receipt upload page",
  },
  "receipt.page.description": {
    message:
      "Upload a receipt image or PDF to record a transaction in your ledger",
    description: "Page description for the receipt upload page",
  },
  "receipt.page.parsing": {
    message: "Analyzing receipt with AI...",
    description: "Loading message while AI parses the receipt",
  },
  "receipt.page.parsingHint": {
    message: "This may take up to 30 seconds.",
    description: "Hint text shown while AI is parsing the receipt",
  },
  "receipt.page.errorTitle": {
    message: "Something went wrong",
    description: "Alert title shown when an error occurs",
  },
  "receipt.page.tryAgain": {
    message: "Try Again",
    description: "Button text to retry after an error",
  },

  // Upload Zone
  "receipt.upload.fileTooLarge": {
    message: "File is too large. Maximum size is 5MB.",
    description: "Validation error when uploaded file exceeds 5MB size limit",
  },
  "receipt.upload.unsupportedType": {
    message:
      "Unsupported file type. Please upload a PDF, PNG, JPG, JPEG, or WebP.",
    description: "Validation error when file type is not supported",
  },
  "receipt.upload.uploading": {
    message: "Uploading...",
    description: "Status text shown while file is being uploaded",
  },
  "receipt.upload.chooseDifferentFile": {
    message: "Choose Different File",
    description: "Button text to replace the currently selected file",
  },
  "receipt.upload.dragAndDrop": {
    message: "Drag and drop your receipt here",
    description: "Instruction text in the drag-and-drop upload zone",
  },
  "receipt.upload.supports": {
    message: "Supports PDF, PNG, JPG, JPEG, WebP — max 5MB",
    description: "Hint text showing supported file formats and size limit",
  },
  "receipt.upload.chooseFile": {
    message: "Choose File",
    description: "Button text to open the file picker",
  },

  // Review Form — validation messages
  "receipt.review.dateRequired": {
    message: "Date is required",
    description: "Validation error when date field is empty",
  },
  "receipt.review.payeeRequired": {
    message: "Payee is required",
    description: "Validation error when payee field is empty",
  },
  "receipt.review.descriptionRequired": {
    message: "Description is required",
    description: "Validation error when description field is empty",
  },
  "receipt.review.amountPositive": {
    message: "Amount must be a positive number",
    description: "Validation error when amount is not a positive number",
  },
  "receipt.review.currencyRequired": {
    message: "Currency is required",
    description: "Validation error when currency field is empty",
  },
  "receipt.review.expenseAccountRequired": {
    message: "Expense account is required",
    description: "Validation error when expense account is not selected",
  },
  "receipt.review.paymentAccountRequired": {
    message: "Payment account is required",
    description: "Validation error when payment account is not selected",
  },
  "receipt.review.documentAccountRequired": {
    message: "Document account is required",
    description: "Validation error when document account is not selected",
  },

  // Review Form — labels and placeholders
  "receipt.review.receiptDetails": {
    message: "Receipt Details",
    description: "Card title for the receipt details section",
  },
  "receipt.review.date": {
    message: "Date",
    description: "Label for the date field",
  },
  "receipt.review.payee": {
    message: "Payee",
    description: "Label for the payee field",
  },
  "receipt.review.merchantName": {
    message: "Merchant name",
    description: "Placeholder for the payee input field",
  },
  "receipt.review.description": {
    message: "Description",
    description: "Label for the description field",
  },
  "receipt.review.transactionDescription": {
    message: "Transaction description",
    description: "Placeholder for the description input field",
  },
  "receipt.review.amount": {
    message: "Amount",
    description: "Label for the amount field",
  },
  "receipt.review.currency": {
    message: "Currency",
    description: "Label for the currency field",
  },
  "receipt.review.accounts": {
    message: "Accounts",
    description: "Card title for the accounts section",
  },
  "receipt.review.expenseAccount": {
    message: "Expense Account",
    description: "Label for the expense account field",
  },
  "receipt.review.selectExpenseAccount": {
    message: "Select expense account",
    description: "Placeholder for the expense account combobox",
  },
  "receipt.review.paymentAccount": {
    message: "Payment Account",
    description: "Label for the payment account field",
  },
  "receipt.review.selectPaymentAccount": {
    message: "Select payment account",
    description: "Placeholder for the payment account combobox",
  },
  "receipt.review.documentAccount": {
    message: "Document Account",
    description: "Label for the document account field",
  },
  "receipt.review.selectDocumentAccount": {
    message: "Select document account",
    description: "Placeholder for the document account combobox",
  },
  "receipt.review.preview": {
    message: "Preview",
    description: "Card title for the Beancount transaction preview",
  },
  "receipt.review.uploadDifferentReceipt": {
    message: "Upload Different Receipt",
    description: "Button text to go back and upload a different receipt",
  },
  "receipt.review.recordTransaction": {
    message: "Record Transaction",
    description: "Submit button text to record the transaction",
  },

  // Success Card
  "receipt.success.title": {
    message: "Transaction Recorded",
    description: "Heading shown after transaction is successfully recorded",
  },
  "receipt.success.description": {
    message: "Your receipt has been saved to your ledger.",
    description: "Description shown after transaction is successfully recorded",
  },
  "receipt.success.payee": {
    message: "Payee",
    description: "Label for payee in the success summary",
  },
  "receipt.success.date": {
    message: "Date",
    description: "Label for date in the success summary",
  },
  "receipt.success.amount": {
    message: "Amount",
    description: "Label for amount in the success summary",
  },
  "receipt.success.expense": {
    message: "Expense",
    description: "Label for expense account in the success summary",
  },
  "receipt.success.payment": {
    message: "Payment",
    description: "Label for payment account in the success summary",
  },
  "receipt.success.viewJournal": {
    message: "View Journal",
    description: "Button text to navigate to the journal after success",
  },
  "receipt.success.uploadAnother": {
    message: "Upload Another Receipt",
    description: "Button text to upload another receipt after success",
  },

  // Workflow error messages
  "receipt.workflow.failedToParse": {
    message: "Failed to parse receipt",
    description: "Error message when AI fails to parse the receipt",
  },
  "receipt.workflow.failedToProcess": {
    message: "Failed to process receipt",
    description: "Generic fallback error message during receipt processing",
  },
  "receipt.workflow.failedToRecord": {
    message: "Failed to record receipt transaction",
    description: "Error message when recording the transaction fails",
  },
};

export default ukReceipt;
