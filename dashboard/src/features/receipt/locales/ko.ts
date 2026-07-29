import type { TranslationEntry } from "@/i18n";

const koReceipt: Record<string, TranslationEntry> = {
  "receipt.page.title": {
    message: "영수증 업로드",
    description: "Page title for the receipt upload page",
  },
  "receipt.page.description": {
    message: "영수증 이미지 또는 PDF를 업로드하여 장부에 거래를 기록하세요",
    description: "Page description for the receipt upload page",
  },
  "receipt.page.parsing": {
    message: "AI로 영수증 분석 중...",
    description: "Loading message while AI parses the receipt",
  },
  "receipt.page.parsingHint": {
    message: "최대 30초 정도 걸릴 수 있습니다.",
    description: "Hint text shown while AI is parsing the receipt",
  },
  "receipt.page.errorTitle": {
    message: "문제가 발생했습니다",
    description: "Alert title shown when an error occurs",
  },
  "receipt.page.tryAgain": {
    message: "다시 시도",
    description: "Button text to retry after an error",
  },
  "receipt.upload.fileTooLarge": {
    message: "파일이 너무 큽니다. 최대 크기는 5MB입니다.",
    description: "Validation error when uploaded file exceeds 5MB size limit",
  },
  "receipt.upload.unsupportedType": {
    message:
      "지원되지 않는 파일 형식입니다. PDF, PNG, JPG, JPEG 또는 WebP를 업로드해 주세요.",
    description: "Validation error when file type is not supported",
  },
  "receipt.upload.uploading": {
    message: "업로드 중...",
    description: "Status text shown while file is being uploaded",
  },
  "receipt.upload.chooseDifferentFile": {
    message: "다른 파일 선택",
    description: "Button text to replace the currently selected file",
  },
  "receipt.upload.dragAndDrop": {
    message: "영수증을 여기에 드래그 앤 드롭",
    description: "Instruction text in the drag-and-drop upload zone",
  },
  "receipt.upload.supports": {
    message: "PDF, PNG, JPG, JPEG, WebP 지원 — 최대 5MB",
    description: "Hint text showing supported file formats and size limit",
  },
  "receipt.upload.chooseFile": {
    message: "파일 선택",
    description: "Button text to open the file picker",
  },
  "receipt.review.dateRequired": {
    message: "날짜는 필수입니다",
    description: "Validation error when date field is empty",
  },
  "receipt.review.payeeRequired": {
    message: "수취인은 필수입니다",
    description: "Validation error when payee field is empty",
  },
  "receipt.review.descriptionRequired": {
    message: "설명은 필수입니다",
    description: "Validation error when description field is empty",
  },
  "receipt.review.amountPositive": {
    message: "금액은 양수여야 합니다",
    description: "Validation error when amount is not a positive number",
  },
  "receipt.review.currencyRequired": {
    message: "통화는 필수입니다",
    description: "Validation error when currency field is empty",
  },
  "receipt.review.expenseAccountRequired": {
    message: "지출 계정은 필수입니다",
    description: "Validation error when expense account is not selected",
  },
  "receipt.review.paymentAccountRequired": {
    message: "결제 계정은 필수입니다",
    description: "Validation error when payment account is not selected",
  },
  "receipt.review.documentAccountRequired": {
    message: "문서 계정은 필수입니다",
    description: "Validation error when document account is not selected",
  },
  "receipt.review.receiptDetails": {
    message: "영수증 세부 정보",
    description: "Card title for the receipt details section",
  },
  "receipt.review.date": {
    message: "날짜",
    description: "Label for the date field",
  },
  "receipt.review.payee": {
    message: "수취인",
    description: "Label for the payee field",
  },
  "receipt.review.merchantName": {
    message: "가맹점 이름",
    description: "Placeholder for the payee input field",
  },
  "receipt.review.description": {
    message: "설명",
    description: "Label for the description field",
  },
  "receipt.review.transactionDescription": {
    message: "거래 설명",
    description: "Placeholder for the description input field",
  },
  "receipt.review.amount": {
    message: "금액",
    description: "Label for the amount field",
  },
  "receipt.review.currency": {
    message: "통화",
    description: "Label for the currency field",
  },
  "receipt.review.accounts": {
    message: "계정",
    description: "Card title for the accounts section",
  },
  "receipt.review.expenseAccount": {
    message: "지출 계정",
    description: "Label for the expense account field",
  },
  "receipt.review.selectExpenseAccount": {
    message: "지출 계정 선택",
    description: "Placeholder for the expense account combobox",
  },
  "receipt.review.paymentAccount": {
    message: "결제 계정",
    description: "Label for the payment account field",
  },
  "receipt.review.selectPaymentAccount": {
    message: "결제 계정 선택",
    description: "Placeholder for the payment account combobox",
  },
  "receipt.review.documentAccount": {
    message: "문서 계정",
    description: "Label for the document account field",
  },
  "receipt.review.selectDocumentAccount": {
    message: "문서 계정 선택",
    description: "Placeholder for the document account combobox",
  },
  "receipt.review.preview": {
    message: "미리보기",
    description: "Card title for the Beancount transaction preview",
  },
  "receipt.review.uploadDifferentReceipt": {
    message: "다른 영수증 업로드",
    description: "Button text to go back and upload a different receipt",
  },
  "receipt.review.recordTransaction": {
    message: "거래 기록",
    description: "Submit button text to record the transaction",
  },
  "receipt.success.title": {
    message: "거래가 기록되었습니다",
    description: "Heading shown after transaction is successfully recorded",
  },
  "receipt.success.description": {
    message: "영수증이 장부에 저장되었습니다.",
    description: "Description shown after transaction is successfully recorded",
  },
  "receipt.success.payee": {
    message: "수취인",
    description: "Label for payee in the success summary",
  },
  "receipt.success.date": {
    message: "날짜",
    description: "Label for date in the success summary",
  },
  "receipt.success.amount": {
    message: "금액",
    description: "Label for amount in the success summary",
  },
  "receipt.success.expense": {
    message: "지출",
    description: "Label for expense account in the success summary",
  },
  "receipt.success.payment": {
    message: "결제",
    description: "Label for payment account in the success summary",
  },
  "receipt.success.viewJournal": {
    message: "분개장 보기",
    description: "Button text to navigate to the journal after success",
  },
  "receipt.success.uploadAnother": {
    message: "다른 영수증 업로드",
    description: "Button text to upload another receipt after success",
  },
  "receipt.workflow.failedToParse": {
    message: "영수증 파싱 실패",
    description: "Error message when AI fails to parse the receipt",
  },
  "receipt.workflow.failedToProcess": {
    message: "영수증 처리 실패",
    description: "Generic fallback error message during receipt processing",
  },
  "receipt.workflow.failedToRecord": {
    message: "영수증 거래 기록 실패",
    description: "Error message when recording the transaction fails",
  },
};

export default koReceipt;
