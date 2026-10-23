import type { TranslationEntry } from "@/i18n";

const koJournal: Record<string, TranslationEntry> = {
  "journal.openEntryWithContext": {
    message: "항목 {entry} 열기(행 {position})",
    description:
      "Accessible name for opening Entry Context, including the entry identity and row position",
  },
  "journal.showEntryPostings_other": {
    message: "{entry}의 분개 내역 {count}개 표시(행 {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_other": {
    message: "{entry}의 분개 내역 {count}개 숨기기(행 {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.visibleEntryPostings_other": {
    message: "{entry}의 분개 내역 {count}개 표시 중(행 {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.account": {
    message: "계정",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "계정 (예: Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "계정은 필수입니다",
    description: "Validation error when account is missing",
  },
  "journal.addNewJournalEntry": {
    message: "새 저널 항목 추가",
    description: "Aria label for add new journal entry button",
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
  "journal.commodity": {
    message: "상품",
    description: "Name of the Commodity directive type",
  },
  "journal.event": {
    message: "이벤트",
    description: "Name of the Event directive type",
  },
  "journal.query": {
    message: "쿼리",
    description: "Name of the Query directive type",
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
    message:
      "선택한 날짜, 계정, 검색식으로 좁힌 원본 거래와 잔액 단언을 다운로드합니다. 항목 유형 및 거래 상태 필터는 적용되지 않습니다.",
    description: "Honest scope for the plaintext journal export dialog",
  },
  "journal.entryContext": {
    message: "항목 컨텍스트",
    description: "Dialog title for entry context",
  },
  "journal.entryContextDescription": {
    message: "{entry}의 소스와 파일 위치.",
    description:
      "Screen-reader description of the entry context dialog; {entry} is the entry's date, payee and narration",
  },
  "journal.entryCreatedSuccess": {
    message: "항목이 성공적으로 생성되었습니다",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "위치:",
    description: "Label for entry location in file",
  },
  "journal.entryLocationUnavailable": {
    message: "소스 위치를 사용할 수 없음",
    description: "항목 컨텍스트에 탐색 가능한 파일/행이 없을 때 표시",
  },
  "journal.openEntrySource": {
    message: "{location}에서 소스 열기",
    description: "Accessible name for the entry source location control",
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
  "journal.flag": {
    message: "플래그",
    description: "Accessible name for the journal flag column",
  },
  "journal.flagAbbrev": {
    message: "F",
    description: "Short label shown in the journal flag column header",
  },
  "journal.accountJournalTable": {
    message: "계정 저널",
    description: "Accessible name for the account journal table",
  },
  "journal.journalTable": {
    message: "저널",
    description: "Accessible name for the ledger journal table",
  },
  "journal.journal": {
    message: "저널",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "저널이 성공적으로 내보내졌습니다",
    description: "Success message after exporting journal",
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
  "journal.metadata": {
    message: "메타데이터",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "서술",
    description: "Placeholder for narration field",
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
  "journal.payeeNarration": {
    message: "수취인/서술",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "수취인",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "보류 중인 거래",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "전기",
    description: "Label for postings toggle filter",
  },
  "journal.postingCost": {
    message: "취득 원가",
    description:
      "Label for the unit lot cost in expanded journal posting details",
  },
  "journal.price": {
    message: "가격",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "계정 선택...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectCurrency": {
    message: "통화 선택...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "서술 선택...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectPayee": {
    message: "수취인 선택...",
    description: "Placeholder for payee selection combobox",
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
  "journal.sourceModified": {
    message: "소스가 수정되었습니다",
    description: "Notice that entry source has unsaved changes",
  },
  "journal.entrySavedSuccess": {
    message: "항목이 성공적으로 저장되었습니다.",
    description: "Toast shown after saving an entry",
  },
  "journal.entryDeleteTitle": {
    message: "항목 삭제",
    description: "Dialog title for the entry deletion confirmation",
  },
  "journal.entryDeleteDescription": {
    message:
      "{location}의 항목을 삭제하시겠습니까? 원장에서 제거되며 앱에서는 실행 취소할 수 없습니다.",
    description:
      "Confirmation message for deleting a journal entry. {location} is replaced with the entry's source location.",
  },
  "journal.entryDeleteConfirm": {
    message: "항목 삭제",
    description: "Confirm button label in the entry deletion confirmation",
  },
  "journal.entryDeleteCancel": {
    message: "취소",
    description: "Cancel button label in the entry deletion confirmation",
  },
  "journal.entryDeletedSuccess": {
    message: "항목이 성공적으로 삭제되었습니다.",
    description: "Toast shown after deleting an entry",
  },
  "journal.noEntryContext": {
    message: "사용 가능한 항목 컨텍스트 데이터가 없습니다.",
    description: "Empty state for entry context",
  },
  "journal.accumulated": {
    message: "누적",
    description: "Label before an accumulated balance difference",
  },
  "journal.fromAccount": {
    message: "에서",
    description: "Label before a pad source account",
  },
  "journal.clearedStatus": {
    message: "삭제됨",
    description: "Cleared transaction status",
  },
  "journal.pendingStatus": {
    message: "보류 중",
    description: "Pending transaction status",
  },
  "journal.addPosting": {
    message: "분개 추가",
    description: "Accessible name for adding a transaction posting row",
  },
  "journal.removePosting": {
    message: "분개 {number} 삭제",
    description:
      "Accessible name for removing a numbered transaction posting row",
  },
  "journal.payee": {
    message: "수취인",
    description: "Label for the payee field",
  },
  "journal.accountLabel": {
    message: "계정",
    description: "Label for the account field of a directive form",
  },
  "journal.amountLabel": {
    message: "금액",
    description: "Label for the amount field of a directive form",
  },
  "journal.currencyLabel": {
    message: "통화",
    description: "Label for the currency field of a directive form",
  },
  "journal.postingAccount": {
    message: "분개 {number} 계정",
    description:
      "Accessible label for a numbered transaction posting's account field",
  },
  "journal.postingAmount": {
    message: "분개 {number} 금액",
    description:
      "Accessible label for a numbered transaction posting's amount field",
  },
  "journal.postingCurrency": {
    message: "분개 {number} 통화",
    description:
      "Accessible label for a numbered transaction posting's currency field",
  },
  "journal.postingsUnbalanced": {
    message:
      "분개가 균형이 맞지 않습니다: {residual}이(가) 남습니다. 금액을 조정하거나 하나를 비워 자동으로 맞추세요.",
    description:
      "Shown when a new transaction's postings leave a residual; {residual} is the amount and currency, e.g. 1 USD",
  },
  "journal.accountNotOpen": {
    message: "{account} 계정은 이 원장에서 열려 있지 않습니다.",
    description:
      "Shown under a New Entry account field naming an account the ledger never opened; {account} is the name",
  },
  "journal.alsoOpenAccount": {
    message: "{date}에 {account} 계정도 열기",
    description:
      "Checkbox label that adds an open directive for {account} dated {date} to the same New Entry write",
  },
  "journal.accountClosedBefore": {
    message: "{account} 계정은 이 항목보다 앞선 {date}에 닫혔습니다.",
    description:
      "Shown under a New Entry account field naming an account closed before the entry; {date} is its close date",
  },
  "journal.accountOpensAfter": {
    message: "{account} 계정은 이 항목 이후인 {date}에 열립니다.",
    description:
      "Shown under a New Entry account field naming an account opened after the entry; {date} is its open date",
  },
  "journal.discardEntryEditTitle": {
    message: "편집 내용을 버릴까요?",
    description:
      "Title of the confirmation shown when leaving Entry Context with unsaved source edits",
  },
  "journal.discardEntryEditDescription": {
    message: "이 항목의 원본에 대한 변경 사항이 저장되지 않았습니다.",
    description: "Body of the Entry Context discard confirmation",
  },
  "journal.keepEditing": {
    message: "계속 편집",
    description:
      "Button that returns to the Entry Context editor with the edit intact",
  },
  "journal.discardEntryEdit": {
    message: "버리기",
    description: "Button that discards the Entry Context edit and leaves",
  },
  "journal.entryChangedElsewhere": {
    message:
      "이 항목은 연 이후에 변경되거나 삭제되어 편집 내용이 저장되지 않았습니다. 편집 내용을 복사한 다음 새로 고쳐 최신 버전을 확인하세요.",
    description:
      "Entry Context save refused because the entry changed elsewhere since it was opened",
  },
  "journal.copyMyEdit": {
    message: "내 편집 복사",
    description: "Copies the unsaved Entry Context edit to the clipboard",
  },
  "journal.reloadEntries": {
    message: "새로 고침",
    description:
      "Closes Entry Context and refreshes the journal to show the latest entries",
  },
  "journal.autoAmount": {
    message: "자동",
    description: "Label for an automatically balanced amount",
  },
  "journal.generatedEntryTitle": {
    message: "생성된 항목",
    description:
      "Heading for the read-only panel shown for a generated (padding) entry",
  },
  "journal.generatedConversionExplanation": {
    message:
      "이 환산은 기간이 제한된 계정 원장의 잔여 원가 잔액을 정리하기 위해 생성되었으므로 보거나 편집하거나 삭제할 소스 줄이 없습니다.",
    description:
      "Explains that a generated conversion entry has no editable source directive",
  },
  "journal.generatedEntryExplanation": {
    message:
      "이 항목은 Beancount가 pad 지시문에서 생성했으므로 보거나 편집하거나 삭제할 소스 줄이 없습니다.",
    description:
      "Explains that a generated padding entry has no editable source directive",
  },
  "journal.generatedOpeningExplanation": {
    message:
      "이 기초 잔액은 계정 원장을 기간으로 제한할 때 생성되었으므로 보거나 편집하거나 삭제할 소스 줄이 없습니다.",
    description:
      "Explains that a generated opening-balance entry has no editable source directive",
  },
  "journal.narration": {
    message: "내역",
    description: "Label for narration field",
  },

  "journal.backToJournal": {
    message: "분개장으로 돌아가기",
    description: "Link from the entry page back to the ledger journal",
  },
  "journal.entryPageTitle": {
    message: "항목",
    description: "Entry page heading for a shared ledger entry URL",
  },
  "journal.entryPageDescription": {
    message: "{ledgerName}의 항목 소스 컨텍스트.",
    description:
      "Entry page description; {ledgerName} is the ledger display name",
  },
  "journal.managedPriceEntryExplanation": {
    message:
      "이 가격은 관리형 피드 {source}에서 가져온 것입니다. 자동으로 업데이트되며 여기서 편집하거나 삭제할 수 없습니다. 덮어쓰려면 이 날짜에 직접 가격 항목을 추가하세요.",
    description:
      "Shown on a price entry that comes from a managed price include. {source} is the feed URL.",
  },
  "journal.pluginCopyExplanation": {
    message:
      "이 항목은 플러그인이 다른 항목에서 생성한 것이라 여기서 편집하거나 삭제할 수 없습니다. 대신 원본 항목을 변경하세요.",
    description:
      "Shown on an entry a plugin generated as a copy of another one.",
  },
  "journal.openSourceEntry": {
    message: "원본 항목 열기",
    description: "Link from a plugin copy to the entry it was made from.",
  },
};

export default koJournal;
