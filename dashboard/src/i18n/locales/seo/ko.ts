export interface TranslationEntry {
  message: string;
  description: string;
}

const koSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Beancount 로그인을 완료하는 중입니다.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "로그인 중",
    description: "Auth callback page title",
  },
  "seo.deviceAuth.description": {
    message: "Authorize CLI access to your Beancount account.",
    description: "Device auth page meta description",
  },
  "seo.deviceAuth.title": {
    message: "Authorize CLI Access",
    description: "Device auth page title",
  },
  "seo.dashboard.description": {
    message: "Beancount 대시보드. 장부에 접근하고 재무 데이터를 관리하세요.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "대시보드",
    description: "Dashboard page title",
  },
  "seo.forgotPassword.description": {
    message: "이메일 주소를 입력하여 Beancount 계정 비밀번호를 재설정하세요.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "비밀번호 찾기",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Beancount로 전문적인 일반 텍스트 회계를 하세요. 강력하고 정확하며 감사 가능한 회계로 재무를 추적하고, 장부를 관리하고, 보고서를 생성하세요.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount 대시보드 - 일반 텍스트 회계",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message: "{ledgerName}의 {accountName}에 대한 계정 세부 정보와 거래 내역.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "AI를 사용하여 {ledgerName}의 재무 데이터에 대해 질문합니다. 거래 분석, 계좌 잔액 탐색, 트렌드 이해, 즉각적인 회계 인사이트를 얻을 수 있습니다.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "{ledgerName}에 대해 질문하기 - AI 재무 어시스턴트",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "{ledgerName}의 재무상태표 보고서. 자산, 부채, 자본을 한눈에 볼 수 있습니다.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "재무상태표 - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "{ledgerName}의 상품 목록과 가격. 통화, 주식, 기타 자산을 추적할 수 있습니다.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "상품 - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerDashboard.description": {
    message:
      "모든 Beancount 장부를 보고 관리합니다. 새 장부를 만들고, 기존 장부에 접근하고, 재무 기록을 정리하세요.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "내 장부",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "{ledgerName}의 문서 첨부와 영수증. 거래의 지원 파일을 정리할 수 있습니다.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "문서 - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "{ledgerName}의 유효성 검사 오류와 경고. 장부의 문제를 검토하고 수정하세요.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "오류 - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "{ledgerName}의 이벤트 타임라인. 중요한 재무 이벤트와 마일스톤을 추적할 수 있습니다.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "이벤트 - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "{ledgerName}의 Beancount 회계 파일을 찾아봅니다.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "파일 - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "{ledgerName}에 새 파일을 만듭니다. 계정, 거래 또는 기타 Beancount 항목을 추가할 수 있습니다.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "파일 생성 - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "{ledgerName}에 파일을 업로드합니다. 기존 Beancount 파일이나 문서를 가져올 수 있습니다.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "파일 업로드 - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "공개 Beancount 장부 예시와 템플릿을 탐색합니다. 자신만의 재무 관리 설정을 위한 영감을 찾아보세요.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "장부 갤러리",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "{ledgerName}의 투자 보유 자산과 포트폴리오. 현재 포지션과 평가액을 볼 수 있습니다.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "보유 자산 - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "CSV, PDF, OFX, 또는 이미지 파일에서 {ledgerName}에 거래를 가져옵니다. 은행 명세서와 영수증을 위한 AI 기반 파싱 기능.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "스마트 가져오기 - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "{ledgerName}의 손익계산서 보고서. 수익, 비용, 순이익을 시간별로 추적할 수 있습니다.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "손익계산서 - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "{ledgerName}의 거래 분개장. 모든 회계 항목을 보고, 검색하고, 필터링할 수 있습니다.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "분개장 - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "{ledgerName}의 재무 개요와 보고서. 순자산, 수입, 지출, 자산 배분을 볼 수 있습니다.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "개요 - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerQuery.description": {
    message:
      "BQL 구문으로 {ledgerName}을 조회합니다. 사용자 지정 쿼리를 실행하고 재무 데이터를 분석할 수 있습니다.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL 쿼리 - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "{ledgerName}의 장부 설정을 구성합니다. 장부 환경 설정, 접근, 옵션을 관리할 수 있습니다.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "장부 설정 - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "{ledgerName}의 통계 분석. 재무 데이터의 지표, 트렌드, 인사이트를 볼 수 있습니다.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "통계 - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "{ledgerName}의 시산표 보고서. 계정의 차변과 대변의 등식을 검증할 수 있습니다.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "시산표 - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message: "Beancount 계정에 로그인하여 재무 장부와 회계 기록을 관리하세요.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "로그인",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Beancount 계정에서 로그아웃하는 중입니다.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "로그아웃",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "찾으시는 페이지가 존재하지 않습니다. 이동되었거나 삭제되었을 수 있습니다.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "페이지를 찾을 수 없습니다",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Beancount 계정의 새 비밀번호를 만드세요.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "비밀번호 재설정",
    description: "Reset password page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "계정과 모든 데이터의 영구 삭제와 같은 파괴적인 계정 작업을 관리합니다.",
    description: "Danger zone settings page meta description",
  },
  "seo.settingsDangerZone.title": {
    message: "위험 구역",
    description: "Danger zone settings page title",
  },
  "seo.settingsGeneral.description": {
    message: "프로필 정보, 언어 설정, 일반 계정 설정을 업데이트하세요.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "일반 설정",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Git을 통해 Beancount 장부에 안전하게 접근하기 위한 SSH 키를 관리하세요.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH 키",
    description: "SSH keys settings page title",
  },
  "seo.signUp.description": {
    message:
      "무료 Beancount 계정을 만들어 일반 텍스트 회계로 재무 관리를 시작하세요.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "계정 만들기",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message: "이메일 주소를 확인하여 Beancount 계정 등록을 완료하세요.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "이메일 확인",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Beancount에 오신 것을 환영합니다! 일반 텍스트 회계와 재무 관리를 시작하세요.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "환영합니다",
    description: "Welcome page title",
  },
  "seo.error.description": {
    message:
      "이 페이지를 불러오는 중 오류가 발생했습니다. 다시 시도하거나 홈 페이지로 돌아가세요.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "오류",
    description: "Error page title",
  },
  "seo.ledgerCommits.description": {
    message:
      "{ledgerName}의 커밋 내역과 버전 관리를 봅니다. 장부 파일에 대한 변경 사항을 시간별로 추적할 수 있습니다.",
    description: "Commits page meta description",
  },
  "seo.ledgerCommits.title": {
    message: "커밋 - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "{ledgerName}의 풀 리퀘스트 변경 사항을 검토합니다. 장부에 대한 제안된 수정 사항을 승인하거나 거절할 수 있습니다.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "풀 리퀘스트 #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Plaid를 사용하여 {ledgerName}에 은행 계좌를 연결합니다. 거래를 자동으로 가져오고 재무 데이터를 동기화할 수 있습니다.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "연결된 계정 - {ledgerName}",
    description: "Plaid settings page title with ledger name",
  },
  "seo.plaidConnections.description": {
    message:
      "Manage your connected bank accounts for {ledgerName} — link new banks, update account mappings, sync, or disconnect.",
    description: "Plaid connections management page meta description",
  },
  "seo.plaidConnections.title": {
    message: "Manage Bank Connections - {ledgerName}",
    description: "Plaid connections management page title with ledger name",
  },
};

export default koSeo;
