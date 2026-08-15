import type { TranslationEntry } from "@/i18n";

const koImporter: Record<string, TranslationEntry> = {
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message: "이 파일은 10MB 제한을 초과합니다. 더 작은 파일을 사용해 주세요.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "이 파일 형식은 지원되지 않습니다. CSV, PDF, OFX, 또는 이미지 파일(PNG, JPG)을 사용해 주세요.",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "파일 읽는 중\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "다른 파일 선택",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "여기에 파일을 드롭하세요",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "CSV, PDF, OFX, 최대 10MB 이미지 파일 지원",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "파일 찾아보기",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "CSV 형식 참조",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "날짜(YYYY-MM-DD), 수취인, 설명, 금액 열을 사용하세요. 음수 값은 지출을 나타냅니다.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDF, OFX 파일, 이미지는 AI로 자동 파싱됩니다 \u2014 수동 형식 지정 불필요.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "파일 형식 감지 중...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "기기에서 CSV 파싱 중...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "AI로 처리 중(5-15초 소요될 수 있습니다)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "처리 중...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "AI를 사용하여 파일에서 거래 데이터를 추출하고 있습니다",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "표준 CSV 형식의 빠른 로컬 처리",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "다른 파일 업로드",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "프리미엄 기능 필요",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "현재 파일 형식에는 AI 기반 파싱이 필요합니다",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "프리미엄으로 업그레이드",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "AI로 PDF, OFX, 이미지 파일을 자동 파싱",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "지금 업그레이드",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "또는",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "CSV 형식 사용",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "CSV 파일은 프리미엄 없이 무료로 파싱할 수 있습니다",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "CSV 예시 다운로드",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "파일 파싱에 실패했습니다",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "파일 처리 중 서버 오류가 발생했습니다. 몇 초 후 다시 시도해 주세요.",
    description: "Description of server error",
  },

  // Preview Table
  "importer.preview.title": {
    message: "가져온 데이터 미리보기",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "계정을 구성하기 전에 파싱된 거래를 검토하세요",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "유효",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "오류",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "행",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "날짜",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "수취인",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "설명",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "금액",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "표시할 데이터가 없습니다",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "유효성 검사 오류 발견",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "일부 행에 유효성 검사 오류가 있습니다. 진행하기 전에 수정하거나 가져오기 시 건너뜁니다.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "다른 파일 업로드",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "구성으로 계속",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "YYYY-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "수취인 이름",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "설명",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "클릭하여 편집",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.actions": {
    message: "작업",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "행 삭제",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "거래를 찾을 수 없습니다",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "파일이 성공적으로 파싱되었지만 거래 데이터를 찾을 수 없습니다. 파일을 확인하고 다시 시도해 주세요.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "다른 파일 시도",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "가져오기 설정 구성",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "모든 거래의 소스 계정과 통화를 설정하고 각 행에 대상 계정을 할당하세요",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "소스 계정",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "소스 계정 선택...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "이 거래가 발생한 은행 계좌",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "통화",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "모든 거래의 통화",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "대상 계정 할당",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "뒤로",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "가져오는 중...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "거래 {count}건 가져오기",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "거래 {count}건 가져오기",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "거래 {count}건 가져오기",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "소스 계정은 필수입니다",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "통화는 필수입니다",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "최소 하나의 거래가 필요합니다",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "선택한 모든 거래에 대상 계정이 있어야 합니다",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "최소 하나의 거래를 선택해야 합니다",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "설명으로 검색...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "금액으로 필터",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "모든 금액",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "양수만",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "음수만",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "표시된 모든 행 선택",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "대상 계정",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "분류 중...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "AI 자동 채우기",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "필터와 일치하는 거래가 없습니다",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "구성할 거래가 없습니다",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "거래 선택",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "계정 선택...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "선택한 행에 필수",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count}건의 거래에 대상 계정이 없습니다. 가져오기 전에 선택한 모든 행에 대상 계정을 할당해 주세요.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count}건의 거래에 대상 계정이 없습니다. 가져오기 전에 선택한 모든 행에 대상 계정을 할당해 주세요.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count}건의 거래에 대상 계정이 없습니다. 가져오기 전에 선택한 모든 행에 대상 계정을 할당해 주세요.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "AI 분류 완료!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count}건의 거래를 성공적으로 분류했습니다",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count}건의 거래를 성공적으로 분류했습니다",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count}건의 거래를 성공적으로 분류했습니다",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "AI 분류에 실패했습니다",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "거래 가져오는 중...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message: "장부에 거래를 추가하는 동안 기다려 주세요",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "가져오기 성공!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count}건의 거래를 성공적으로 가져왔습니다",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count}건의 거래를 성공적으로 가져왔습니다",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count}건의 거래를 성공적으로 가져왔습니다",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count}건의 거래 가져오기에 실패했습니다",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count}건의 거래 가져오기에 실패했습니다",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count}건의 거래 가져오기에 실패했습니다",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "저널 보기",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "더 가져오기",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "실패한 거래:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "행",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "개의 추가 오류",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "가져오기 실패",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "거래를 가져오는 중 오류가 발생했습니다",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "오류 세부 정보:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "처음부터 시작",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "스마트 가져오기",
    description: "Page title for the importer page",
  },
};

export default koImporter;
