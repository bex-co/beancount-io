import type { TranslationEntry } from "@/i18n";

const koJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "계정",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "계정 선택기",
    description: "Dialog or dropdown title for selecting account",
  },
  "journal.accountPlaceholder": {
    message: "계정 (예: Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "계정은 필수입니다",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "계정",
    description: "Plural form of account",
  },
  "journal.accountsPlural": {
    message: "계정",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "새 저널 항목 추가",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "전기 추가",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "거래 추가",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "금액을 입력해 주세요",
    description: "Validation error when amount is not provided",
  },
  "journal.amountMustBeNumber": {
    message: "금액은 유효한 숫자여야 합니다",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "금액 (예: 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "금액은 필수입니다",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastOnePosting": {
    message: "최소 하나의 전기가 필요합니다",
    description: "Validation error when no postings exist",
  },
  "journal.atLeastTwoPostings": {
    message: "최소 두 개의 전기가 필요합니다",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "잔액",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "잔액",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "항목 후 잔액",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "항목 전 잔액",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "예산 항목",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "변경",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "결제된 거래",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "닫기",
    description: "Close account entry type filter",
  },
  "journal.closeAccount": {
    message: "계정 닫기",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "비용",
    description: "Table header for cost column",
  },
  "journal.createNewJournalEntry": {
    message: "이 장부에 새 저널 항목 만들기",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "계정 항목 만들기",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "잔액 항목 만들기",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "메모 항목 만들기",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "거래 항목 만들기",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "통화 (예: USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "통화는 필수입니다",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "사용자 정의",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "날짜",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "발견된 문서",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "문서",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "현재 필터링된 항목을 Beancount 파일로 다운로드",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "항목 컨텍스트",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "항목이 성공적으로 생성되었습니다",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "위치:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "저널 항목 로딩 오류",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "내보내기",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "저널 내보내기",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "내보내는 중...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "잔액 항목 생성에 실패했습니다",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "메모 항목 생성에 실패했습니다",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "거래 생성에 실패했습니다",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "저널 내보내기에 실패했습니다",
    description: "Error message when journal export fails",
  },
  "journal.flagPlaceholder": {
    message: "플래그 (예: *)",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "출금 계정",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "저널",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "저널이 성공적으로 내보내졌습니다",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "저널 로드 실패: ",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message: '"거래 추가" 버튼으로 항목 만들기',
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "웹 인터페이스를 통해 beancount 파일 업로드",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "기존 회계 데이터 가져오기",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message: "거래를 추가하면 여기에 표시됩니다.",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "시작하려면:",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "아직 저널 항목이 없습니다.",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "저널에 오신 것을 환영합니다! 📔",
    description: "Welcome title for empty journal page",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "연결된 문서",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "항목 컨텍스트 로딩 중...",
    description: "Loading message while fetching entry context",
  },
  "journal.loadingMore": {
    message: "더 로딩 중...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "메타데이터",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "서술",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "서술",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "서술은 필수입니다",
    description: "Validation error when narration is missing",
  },
  "journal.newEntry": {
    message: "새 항목",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "통화를 찾을 수 없습니다",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "현재 필터에 맞는 저널 항목이 없습니다.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noMoreEntries": {
    message: "더 이상 항목이 없습니다",
    description: "Message when no more entries to load",
  },
  "journal.noNarrationsFound": {
    message: "서술을 찾을 수 없습니다",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "수취인을 찾을 수 없습니다",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "메모",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "메모 내용",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "메모 내용은 필수입니다",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "열기",
    description: "Open account entry type filter",
  },
  "journal.openAccount": {
    message: "계정 열기",
    description: "Action to open a new account",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "기타 거래",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "패드",
    description: "Pad entry type filter",
  },
  "journal.payee": {
    message: "수취인",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "수취인/서술",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "수취인",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "수취인은 필수입니다",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "보류 중인 거래",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "입력해 주세요...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "전기",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "전기",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "가격",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "가격",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "빠른 추가",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "저장에 실패했습니다",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "거래가 저장되었습니다!",
    description: "Success message after saving transaction",
  },
  "journal.selectAccount": {
    message: "계정 선택...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "잔액 날짜 선택",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "통화 선택...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "서술 선택...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "메모 날짜 선택",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "수취인 선택...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.selectTransactionDate": {
    message: "거래 날짜 선택",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "입금 계정",
    description: "Label for destination account in transaction",
  },
  "journal.toggleMetadata": {
    message: "메타데이터 전환",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "전기 전환",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "거래",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "거래",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "단위",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "알 수 없는 지시어 유형",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default koJournal;
