export interface TranslationEntry {
  message: string;
  description: string;
}

const koDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "장부 만들기",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "새 장부 만들기",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message: "재무를 관리하기 위한 새 Beancount 장부를 만드세요.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "대시보드",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "대시보드로 이동",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "장부 삭제",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      '"{name}"을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "삭제 중...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "설명 (선택 사항)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "장부 편집",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "장부 설정 편집",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "설명 입력",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "장부 이름 입력",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "장부를 로드하지 못했습니다",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "장부가 성공적으로 생성되었습니다",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "장부가 성공적으로 삭제되었습니다",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerName": {
    message: "장부 이름",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "{ledger} 설정",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "장부가 성공적으로 업데이트되었습니다",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "장부 로딩 중...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Beancount 장부 관리",
    description: "Description of ledger management",
  },
  "page.dashboard.nameMaxLength": {
    message: "이름은 100자 미만이어야 합니다",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "이름은 필수입니다",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "개인 장부",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "구매를 기록하고 남은 돈에 미치는 영향을 파악하세요.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "프리랜서 장부",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message: "고객 수입을 기록하거나 미지급 고객의 잔액을 확인하세요.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "사업 장부",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message: "개설 포지션을 마련하고 자금 조달과 매출을 구분하세요.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "포트폴리오 장부",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message: "매수를 기록하고 수량, 취득 기록, 현금 이동을 확인하세요.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "임대 장부",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "영수증을 기록하고 임대료와 환불 가능한 보증금을 구분하세요.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "공동 지출 장부",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "대납을 기록하고 누가 누구에게 빚졌는지 확인하세요.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "커뮤니티 장부",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "기여금, 프로젝트 지출, 남은 자금을 설명하세요.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "빈 장부",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message: "원치 않는 카테고리를 제거하지 않고 선택한 구조를 추가하세요.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "100 또는 -30.50 같은 금액을 입력하세요",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "운영 통화",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "장부 시작일",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "개설 계정",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "개설 잔액 (선택 사항)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "나중에 결정",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "검토",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "정확히 이 내용이 생성됩니다. 변경하려면 뒤로 가세요.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "계정",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "{total}단계 중 {step}단계",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.nameInvalid": {
    message:
      "라틴 문자(A–Z)나 숫자를 하나 이상 사용하세요. 이름은 장부의 웹 주소가 됩니다.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.repositoryName": {
    message: "저장소 이름",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.noLedgersFound": {
    message: "장부를 찾을 수 없습니다",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message: "첫 번째 장부를 만들어 재무 추적을 시작하세요.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "비공개",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "나와 협력자만 접근할 수 있습니다",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "공개",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "링크를 가진 누구나 재무 데이터를 볼 수 있습니다",
    description: "Warning about public access level",
  },
  "page.dashboard.retry": {
    message: "다시 시도",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "장부 검색...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "장부 선택",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — 장부 전환",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "장부의 세부 정보를 업데이트합니다.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "내 장부",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "{owner}의 계정으로",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "장부 한도에 도달했습니다. 더 많은 장부를 만들려면 업그레이드하세요.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.feedError": {
    message: "피드 로드에 실패했습니다",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.showMore": {
    message: "더 보기",
    description: "Button text to load more feed items",
  },
  "page.dashboard.activity": {
    message: "활동",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "장부의 변경 내역이 여기에 표시됩니다.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "볼 수 있는 모든 장부의 변경 내역",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message: "활동을 새로 고치지 못했습니다. 이전에 불러온 내용을 표시합니다.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default koDashboardPage;
