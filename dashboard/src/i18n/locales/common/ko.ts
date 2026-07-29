export interface TranslationEntry {
  message: string;
  description: string;
}

const koCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "계정",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "작업",
    description: "Plural form of actions",
  },
  "common.adminPermissionRequired": {
    message: "이 페이지에 접근하려면 관리자 권한이 필요합니다.",
    description: "Specific message for admin-only pages",
  },
  "common.anErrorOccurred": {
    message: "오류가 발생했습니다",
    description: "Generic error message",
  },
  "common.back": {
    message: "뒤로",
    description: "Button label to go back to previous page",
  },
  "common.backToLedger": {
    message: "장부로 돌아가기",
    description: "Button text to go back to ledger overview",
  },
  "common.beancountDashboard": {
    message: "Beancount 대시보드",
    description: "Main application title",
  },
  "common.beancountLogo": {
    message: "Beancount 로고",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "취소",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "지우기",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "닫기",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "협력자 제한",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "협력자 제한에 도달했습니다",
    description: "Title when collaborator limit is reached",
  },
  "common.collaboratorsLimitReachedMessage": {
    message:
      "{max}명의 협력자 제한에 도달했습니다. 프리미엄으로 업그레이드하면 장부에 더 많은 협력자를 추가할 수 있습니다.",
    description: "Message when collaborator limit is reached",
  },
  "common.collaboratorsUsed": {
    message: "{max}명 중 {used}명의 협력자",
    description: "Shows current collaborator usage",
  },
  "common.confirm": {
    message: "확인",
    description: "Button label to confirm action",
  },
  "common.copied": {
    message: "복사됨",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "복사",
    description: "Button label to copy content",
  },
  "common.dashboardTagline": {
    message: "일반 텍스트 회계. 강력하고, 정확하며, 감사 가능합니다.",
    description: "Tagline describing the application",
  },
  "common.delete": {
    message: "삭제",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.done": {
    message: "완료",
    description: "Button label indicating completion",
  },
  "common.edit": {
    message: "편집",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "예기치 못한 오류가 발생했습니다. 다시 시도하거나 이전 페이지로 돌아가세요.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "오류 세부 정보",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "오류가 발생했습니다",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "문제가 발생했습니다",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "데이터 불러오기 실패",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadDataDescription": {
    message:
      "장부 정보를 가져올 수 없습니다. 연결을 확인하고 다시 시도해 주세요.",
    description: "Error description when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "장부 불러오기 실패",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "뒤로 가기",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "홈으로",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "다음 페이지로",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "이전 페이지로",
    description: "Aria label for previous page button",
  },
  "common.home": {
    message: "홈",
    description: "Navigation label for home page",
  },
  "common.insufficientPermissions": {
    message: "권한이 부족합니다",
    description: "Error title when user lacks required permissions",
  },
  "common.insufficientPermissionsDescription": {
    message:
      "이 페이지에 접근하기 위한 필요한 권한이 없습니다. 접근에 대해 장부 관리자에게 문의하세요.",
    description: "Error description when user lacks required permissions",
  },
  "common.import": {
    message: "가져오기",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "항목 추가",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "거래, 잔액 또는 메모",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "스마트 가져오기",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "은행 명세서, CSV, PDF 또는 스캔",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "은행 연결",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "거래 자동 동기화",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "영수증 업로드",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "AI로 영수증 스캔",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "잘못된 URL 매개변수",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "제공된 URL 매개변수가 유효하지 않습니다. 링크를 확인하고 다시 시도해 주세요.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "마지막 업데이트",
    description: "Table column header for last update time",
  },
  "common.ledger": {
    message: "장부",
    description: "Navigation label for ledger page",
  },
  "common.ledgerSettings": {
    message: "장부 설정",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "장부 제한",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "장부 제한에 도달했습니다",
    description: "Title when ledger limit is reached",
  },
  "common.ledgersUsed": {
    message: "{max}개 중 {used}개의 장부 사용 중",
    description: "Shows current ledger usage",
  },
  "common.loading": {
    message: "불러오는 중...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "데이터 불러오는 중...",
    description: "Generic loading state message",
  },
  "common.mine": {
    message: "내 것",
    description: "Navigation label for user profile section",
  },
  "common.morePages": {
    message: "더 많은 페이지",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "이름",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "제한에 가까워짐",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "네트워크 연결에 실패했습니다",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "다음",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "다음",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "데이터를 찾을 수 없습니다.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "결과를 찾을 수 없습니다.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "기타",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "소유자",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "페이지를 찾을 수 없습니다",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message: "찾으시는 페이지가 존재하지 않거나 다른 위치로 이동되었습니다.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "페이지 탐색",
    description: "Aria label for pagination navigation",
  },
  "common.pleaseRetryLater": {
    message: "나중에 다시 시도해 주세요",
    description: "Suggestion message after error",
  },
  "common.premiumBenefit.collaborators": {
    message: "장부당 최대 5명의 협력자 추가",
    description: "Premium benefit for more collaborators",
  },
  "common.premiumBenefit.ledgers": {
    message: "1개 대신 최대 5개의 장부 생성",
    description: "Premium benefit for more ledgers",
  },
  "common.premiumBenefit.moreCollaborators": {
    message: "2명 대신 최대 5명의 협력자 초대",
    description: "Premium benefit for more collaborators",
  },
  "common.premiumBenefit.unlimitedFeatures": {
    message: "고급 기능 및 우선 지원 접근",
    description: "Premium benefit for unlimited features",
  },
  "common.premiumBenefits": {
    message: "프리미엄 혜택",
    description: "Section title for list of premium benefits",
  },
  "common.previous": {
    message: "이전",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "관련 페이지",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "저장",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "저장 중...",
    description: "Saving state message",
  },
  "common.search": {
    message: "검색",
    description: "Button or input label for search functionality",
  },
  "common.seeAlso": {
    message: "관련 페이지",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "보기 선택",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "날짜 선택",
    description: "Screen reader label for date picker button",
  },
  "common.setting": {
    message: "설정",
    description: "Singular form of settings",
  },
  "common.settings": {
    message: "설정",
    description: "Navigation label for settings page",
  },
  "common.share": {
    message: "공유",
    description: "Button label to share content",
  },
  "common.sidebar": {
    message: "사이드바",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "모바일 사이드바를 표시합니다.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "별표",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "상태",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "사이드바 전환",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "다시 시도",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "장부를 불러오는 중 예기치 못한 오류가 발생했습니다.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "알 수 없음",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "업데이트 중...",
    description: "Updating state message",
  },
  "common.upgradeNow": {
    message: "지금 업그레이드",
    description: "Button text to upgrade immediately",
  },
  "common.upgradeToPremium": {
    message: "프리미엄으로 업그레이드",
    description: "Title for upgrade prompt dialog",
  },
  "common.upgradeToPro": {
    message: "Pro로 업그레이드",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "업그레이드하여 잠금 해제",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "user@example.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "사용자",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "다운로드",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "추가 작업",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "자세히 알아보기",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "{ledgerName}의 상세 계정 정보를 봅니다. 거래, 잔액, 계정 내역을 분석할 수 있습니다.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "AI를 사용하여 {ledgerName}의 재무 데이터에 대해 질문합니다. 거래 분석, 계좌 잔액 탐색, 트렌드 이해, 즉각적인 회계 인사이트를 얻을 수 있습니다.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "{ledgerName}의 재무상태표를 봅니다. 어느 시점에서든 자산, 부채, 자본을 분석할 수 있습니다.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.collaborators": {
    message:
      "{ledgerName}의 협력자를 관리합니다. 사용자를 초대하고 접근 권한을 제어할 수 있습니다.",
    description: "Description for collaborators page",
  },
  "common.pageDescription.commodities": {
    message:
      "{ledgerName}에서 사용된 상품(통화, 주식, 자산)을 보고 관리합니다. 환율과 가격 내역을 추적할 수 있습니다.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "{ledgerName}에 새 파일을 생성합니다. Beancount 장부 파일이나 문서를 리포지토리에 추가할 수 있습니다.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "{ledgerName}의 거래에 첨부된 문서를 탐색합니다. 영수증, 청구서, 지원 문서를 볼 수 있습니다.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "{ledgerName}의 파싱 및 유효성 검사 오류를 봅니다. 정확한 재무 보고서를 위해 문제를 수정하세요.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "{ledgerName}의 중요 이벤트와 마일스톤을 봅니다. 계좌 개설, 폐쇄, 생애주기 이벤트를 추적할 수 있습니다.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "{ledgerName}의 Beancount 소스 파일을 탐색하고 편집합니다. 계정 차트와 거래 내역을 관리할 수 있습니다.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "{ledgerName}의 현재 보유 자산과 포트폴리오를 분석합니다. 자산 배분, 시장 가치, 미실현 손익을 볼 수 있습니다.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "은행 명세서, 스프레드시트, 또는 영수증에서 {ledgerName}에 거래를 추가합니다. CSV, PDF, OFX, 10MB 이하의 이미지 파일을 지원합니다.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "{ledgerName}의 수입과 지출을 봅니다. 수익, 비용, 수익성을 시간별로 추적할 수 있습니다.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "{ledgerName}의 모든 거래를 탐색하고 필터링합니다. 날짜, 계정, 적요 또는 수취인으로 검색할 수 있습니다.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "{ledgerName}의 재무 대시보드. 계좌 잔액, 순자산 트렌드, 수입/지출 요약을 볼 수 있습니다.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "{ledgerName}에서 BQL(Beancount Query Language) 쿼리를 실행합니다. SQL과 유사한 구문으로 재무 데이터를 필터링하고 분석할 수 있습니다.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "{ledgerName}의 설정을 구성합니다. 기준 통화, 협력자, 개인 정보 설정을 관리할 수 있습니다.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "{ledgerName}의 장부 통계를 봅니다. 거래 수, 계정 사용량, 데이터 품질 지표를 분석할 수 있습니다.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "{ledgerName}의 시산표를 봅니다. 모든 계정에서 차변과 대변이 일치하는지 확인할 수 있습니다.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "{ledgerName}에 파일을 업로드합니다. 기존 Beancount 파일이나 문서를 가져올 수 있습니다.",
    description: "Description for upload files page",
  },
  "common.pageDescription.versionHistory": {
    message:
      "{ledgerName}의 커밋 내역을 봅니다. 장부 파일에 대한 변경 사항을 시간별로 추적할 수 있습니다.",
    description: "Description for version history page",
  },
  "common.postings": {
    message: "전기",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.account": {
    message: "계정",
    description: "Link label for account page",
  },
  "common.relatedLinks.balanceSheet": {
    message: "재무상태표",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.collaborators": {
    message: "협력자",
    description: "Link label for collaborators page",
  },
  "common.relatedLinks.commodities": {
    message: "상품",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "파일 생성",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "문서",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "오류",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "이벤트",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "파일",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "보유 자산",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "가져오기",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "손익계산서",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "분개장",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "개요",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "쿼리",
    description: "Link label for query page",
  },
  "common.relatedLinks.settings": {
    message: "설정",
    description: "Link label for settings page",
  },
  "common.relatedLinks.statistics": {
    message: "통계",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "시산표",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "파일 업로드",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.versionHistory": {
    message: "버전 기록",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "결과",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "행",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "성공",
    description: "Auto-generated from code usage",
  },
  "common.amount": {
    message: "금액",
    description: "Label for amount column in tables",
  },
  "common.assets": {
    message: "자산",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "원가 기준",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "시장 가치 기준",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "보고서",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "고급",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.needHelp": {
    message: "도움이 필요하신가요?",
    description: "Navigation label for the external help link",
  },
  "common.helpAndSupport": {
    message: "도움말 및 지원",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "도움말 센터",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "가이드 및 문서 보기",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "커뮤니티 지원",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Telegram 커뮤니티에 질문하기",
    description: "Description for the community support menu item",
  },
  "common.balanceSheet": {
    message: "재무상태표",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "모두 지우기",
    description: "Button text to clear all filters",
  },
  "common.commodities": {
    message: "상품",
    description: "Label for commodities column in tables",
  },
  "component.conversionSelect.convertedTo": {
    message: "로 변환",
    description: "Prefix for currency conversion option",
  },
  "common.currency": {
    message: "통화",
    description: "Label for currency column in tables",
  },
  "component.intervalSelect.daily": {
    message: "매일",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "자본",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "데이터 불러오기 오류",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "지출",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "필터 옵션 불러오기 실패",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "태그, 수취인 등으로 필터...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "{ledgerName}의 {sectionName} 상세 분석 (USD 및 기타 상품 값 포함)",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} 목록",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName} 계층",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "{ledgerName}의 {sectionName} 구성의 시각적 표현",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "수입",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "손익계산서",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "부채",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "순이익",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "순자산",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "계정을 찾을 수 없습니다",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "파일 검색...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "파일을 찾을 수 없습니다",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "데이터 없음",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "선택한 필터에 대한 데이터 없음",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "일치하는 항목 없음",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "개요",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "나중에 다시 시도해 주세요",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "분기",
    description: "Quarterly interval option",
  },
  "common.savings": {
    message: "저축",
    description: "Label for savings node in cash flow diagram",
  },
  "component.accountCombobox.placeholder": {
    message: "계정 검색...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "변환 선택",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "기간 선택",
    description: "Placeholder for interval select dropdown",
  },
  "common.summary": {
    message: "요약",
    description: "Label for summary section or table",
  },
  "component.searchControls.time": {
    message: "기간",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "시산표",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "검색하려면 입력...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "단위",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "연간",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "계정",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "오류",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "세션이 만료되었습니다",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message: "로그인 세션이 만료되었습니다. 계속하려면 다시 로그인하세요.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "계속하려면 로그인하세요.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "이 작업을 수행할 권한이 없습니다.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "요청한 리소스를 찾을 수 없습니다.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message: "입력한 정보 중 일부가 잘못되었습니다. 확인 후 다시 시도하세요.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "유효성 검사에 실패했습니다. 입력 내용을 확인하고 다시 시도하세요.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "이 변경 사항이 현재 상태와 충돌합니다. 페이지를 새로 고친 후 다시 시도하세요.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "서버에 문제가 발생했습니다. 나중에 다시 시도하세요.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도하세요.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message: "플랜 한도에 도달했습니다. 계속하려면 업그레이드하세요.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "이 작업은 허용되지 않습니다.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "이 기능을 사용하려면 프리미엄 구독이 필요합니다.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message: "연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도하세요.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "문제가 발생했습니다. 다시 시도하세요.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "문제가 발생했습니다",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "이 섹션을 표시할 수 없습니다. 페이지의 나머지 부분은 계속 사용할 수 있습니다.",
    description: "Body of the error boundary fallback panel",
  },
};

export default koCommon;
