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
  "page.dashboard.failedToLoadLedgersDescription": {
    message: "장부를 가져올 수 없습니다. 연결을 확인하고 다시 시도해 주세요.",
    description: "Detailed error description for ledger loading failure",
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
  "page.dashboard.manageLedgersDescription": {
    message:
      "Beancount 장부를 관리하세요. 장부를 클릭하여 세부 정보를 확인하세요.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameMaxLength": {
    message: "이름은 100자 미만이어야 합니다",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "이름은 필수입니다",
    description: "Validation error when name is missing",
  },
  "page.dashboard.nameInvalid": {
    message: "이름에는 최소 하나의 문자 또는 숫자가 포함되어야 합니다",
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
    description: "Aria label for ledger switcher button",
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
  "page.dashboard.blogFeed": {
    message: "최신 업데이트",
    description: "Title for blog feed section on dashboard",
  },
  "page.dashboard.feedError": {
    message: "피드 로드에 실패했습니다",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.noFeedItems": {
    message: "피드 항목이 없습니다",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.showMore": {
    message: "더 보기",
    description: "Button text to load more feed items",
  },
};

export default koDashboardPage;
