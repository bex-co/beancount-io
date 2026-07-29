import type { TranslationEntry } from "@/i18n";

const koPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.connectedSuccessfully": {
    message: "✓ 연결되었습니다",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "은행 동기화",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "계정 연결",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message: "은행 수준의 암호화로 안전하게 거래 내역을 자동으로 가져오기",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "회계 워크플로우 간소화",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Plaid를 통해 은행 계좌를 연결하여 거래 내역을 자동으로 가져오고, 수동 데이터 입력 시간을 절약하며, 원장을 실시간으로 최신 상태로 유지하세요.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "11,000개 이상의 금융기관",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "은행 수준의 보안",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "실시간 동기화",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "시작하기",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "은행을 연결하는 이유",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "자동 가져오기",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "은행 계좌의 거래 내역을 실시간으로 자동 가져와 수동 입력 시간을 대폭 절감하세요. 데이터 입력이 아닌 분석에 집중할 수 있습니다.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "은행 수준의 보안",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid는 256비트 암호화를 사용하며 수천 개의 금융기관에서 신뢰받고 있습니다. 고객님의 인증 정보는 당사 서버에 저장되지 않습니다.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "개인정보 보호 우선",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "고객님의 은행 인증 정보를 저장하거나 데이터를 판매하지 않습니다. 재무 정보는 업계 최고 수준의 개인정보 보호 기준으로 보호됩니다.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "이용 방법",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "몇 가지 간단한 단계로 은행 계좌를 연결하세요",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "은행 선택",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "11,000개 이상의 지원 금융기관에서 검색",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "안전한 인증",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "은행의 인증 시스템을 통해 안전하게 로그인",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "가져오기 시작",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message: "거래 내역이 원장에 자동으로 동기화됩니다",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "다른 은행 연결",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "은행 연결",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Bank Connections",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message: "Manage account mappings, sync, and disconnect banks.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "연결된 은행 없음",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "은행을 연결하여 거래 내역을 자동으로 가져오세요.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Sync",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Syncing...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Manage Banks",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Back to Transactions",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Sync Complete",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message:
      "{count} new transaction(s) synced across {institutionCount} bank(s).",
    description:
      "Toast description after syncing every connected bank - interpolation: {count}, {institutionCount}",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} bank(s) need reconnecting",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count}",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Failed to sync transactions. Please try again.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "{date}에 연결됨",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "활성",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "재인증 필요",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "비활성",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "마지막 동기화",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount": {
    message: "거래 {count}건",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "실패",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "재연결 중...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "은행 재연결",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "연결 해제 중...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "연결 해제",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "은행 계좌 연결 해제",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "{institutionName} 연결을 해제하시겠습니까? 모든 연결된 계좌가 삭제되고 자동 거래 동기화가 중단됩니다.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "취소",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "은행 연결이 해제되었습니다",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} 연결이 해제되었습니다.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "오류",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "은행 계좌 연결 해제에 실패했습니다.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "계좌 매핑을 설정할 은행 계좌를 선택하세요",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "이 은행에서 계좌를 찾을 수 없습니다",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "계좌 관리",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "이 은행이 공유하는 계좌를 추가하거나 제거합니다",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "먼저 이 은행을 다시 연결하세요",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "계좌 추가",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "계좌를 업데이트하는 중…",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "준비 중…",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "은행 응답을 기다리는 중…",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "변경 사항을 적용하는 중…",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "계좌가 업데이트되었습니다",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added}개 추가, {removed}개 제거되었습니다.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "계좌 변경 없음",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "변경된 내용이 없습니다. 일부 은행은 자체 앱이나 웹사이트에서만 공유 계좌를 변경할 수 있습니다.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "계좌를 업데이트할 수 없습니다",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "은행에는 변경 사항이 저장되었을 수 있습니다. 계좌 관리를 다시 열어 시도하세요.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "계좌 변경이 취소되었습니다",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "계좌를 변경하지 않은 채 Plaid Link가 닫혔습니다.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "계좌",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.mapped": {
    message: "매핑됨",
    description: "Badge text for mapped account",
  },
  "plaid.accountMapping.currency": {
    message: "통화",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Beancount 계좌",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "저장 중...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "저장",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "취소",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "매핑되지 않음",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "편집",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "매핑 설정",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "AI suggested",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "AI suggests: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Getting AI suggestions...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Accept All Suggestions ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Accepting...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "잘못된 계좌",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "유효한 Beancount 계좌 이름을 입력해 주세요.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "매핑이 저장되었습니다",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message:
      "{accountName}이(가) {ledgerAccount}에 매핑되었습니다 ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "오류",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "계좌 매핑 저장에 실패했습니다.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Suggestions Accepted",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "Mapped {count} account(s) using AI suggestions.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count}",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "은행 거래가 없습니다",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message: "모든 거래가 원장에 동기화되었거나 새로운 거래가 없습니다.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "은행 거래",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "{count}건의 거래{plural}를 검토하고 원장에 제출",
    description:
      "Card description - interpolation: {count} for number, {plural} for 's' or empty",
  },
  "plaid.transactionReview.submitting": {
    message: "제출 중...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "제출",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "가맹점 또는 설명으로 검색...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "은행으로 필터링",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "모든 은행",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "은행 계좌로 필터링",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "모든 은행 계좌",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected": {
    message: "계좌 {count}개 선택됨",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "현재 필터와 일치하는 거래가 없습니다.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "필터 지우기",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "선택한 거래 {count}건이 현재 필터로 숨겨져 있지만 제출 또는 삭제 대상에 포함됩니다.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count}",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "가져올 파일을 선택하세요",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message: "선택한 거래 {count}건은 제출 전에 대상 계좌가 필요합니다.",
    description:
      "Alert message for missing target accounts - interpolation: {count}",
  },
  "plaid.transactionReview.selectAll": {
    message: "모두 선택",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "날짜",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Bank",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Source Account",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "가맹점",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "설명",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "금액",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "대상 계좌",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "AI 처리 중...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "AI 자동 입력",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "계좌 선택...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "분류 완료",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription": {
    message: "AI가 {count}건의 거래에 계좌를 제안했습니다.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "분류 실패",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "거래 분류에 실패했습니다. 다시 시도해 주세요.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "선택된 거래가 없습니다",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "제출할 거래를 하나 이상 선택해 주세요.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "대상 계좌 누락",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "선택한 거래 {count}건에 대상 계좌가 필요합니다.",
    description:
      "Toast description for missing accounts - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "거래가 제출되었습니다",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription": {
    message: "{count}건의 거래가 원장에 추가되었습니다.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "제출 실패",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "거래 제출에 실패했습니다. 다시 시도해 주세요.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "[TODO] Delete",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "[TODO] Deleting...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "[TODO] Delete Transactions?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "[TODO] This will permanently remove {count} selected transaction(s) from this list. This cannot be undone.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "[TODO] Transactions Deleted",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "[TODO] {count} transaction(s) removed from this list.",
    description:
      "Toast description for deleted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "[TODO] Deletion Failed",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "[TODO] Failed to delete transactions. Please try again.",
    description: "Toast description for deletion failure",
  },
};

export default koPlaid;
