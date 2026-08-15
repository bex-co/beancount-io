import type { TranslationEntry } from "@/i18n";

const koUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accountDeleted": {
    message: "계정이 성공적으로 삭제되었습니다",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "새 키 추가",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "추가됨",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "업로드된 모든 문서 및 첨부 파일",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "모든 원장 및 거래 내역",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "모든 환경 설정",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "모든 거래 및 기록",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "외관",
    description: "Appearance settings section label",
  },
  "userSettings.cannotBeUndone": {
    message: "이 작업은 취소할 수 없습니다.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeUsername": {
    message: "사용자 이름 변경",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "키 생성",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "새 API 키 생성",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Beancount API 인증을 위한 새 공개 키를 추가합니다.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "새 키 생성",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "생성 중...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "언어",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "애플리케이션의 외관과 느낌을 사용자 지정",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "위험 구역",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "다크",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "계정 삭제",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: '확인을 위해 아래에 사용자 이름 "{username}"을 입력하세요:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "사용자 이름 입력",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "이 작업은 취소할 수 없습니다. 계정이 영구적으로 삭제되고 모든 데이터가 서버에서 제거됩니다.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "계정을 삭제하시겠습니까?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "계정 및 관련된 모든 데이터를 영구적으로 삭제합니다. 이 작업은 취소할 수 없습니다.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "키 삭제",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "SSH 키 삭제",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "이 키를 삭제하시겠습니까",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "삭제 중...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewUsername": {
    message: "아래에 새 사용자 이름을 입력하세요",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "새 사용자 이름 입력",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "키 생성 오류",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "설정 로드 오류",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToLoadKeys": {
    message: "키 로드에 실패했습니다",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message: "SSH 키를 로드하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "설정 로드에 실패했습니다",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "구독 상태 로드에 실패했습니다",
    description: "Error message when subscription fails to load",
  },
  "userSettings.followingWillBeDeleted": {
    message: "다음 항목이 영구적으로 삭제됩니다:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "일반",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "초대",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "되돌릴 수 없는 파괴적인 작업",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "키 제목",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "나중에 식별하는 데 도움이 되도록 이 키의 설명적인 이름을 입력하세요.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "예: 개발 키",
    description: "Placeholder for key title input",
  },
  "userSettings.lastUsed3Months": {
    message: "최근 3개월 이내 사용",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "최근 3주 이내 사용",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "3개월 이상 전에 사용",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "최근 1주 이내 사용",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "라이트",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "계정 정보를 로드하는 중...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "세션 정보를 로드하는 중...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "SSH 키를 로드하는 중...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "구독 세부 정보를 로드하는 중...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "테마 환경 설정을 로드하는 중...",
    description: "Loading message for theme settings",
  },
  "userSettings.accessUntil": {
    message: "액세스 기한",
    description: "Label for access remaining until date",
  },
  "userSettings.cancelSubscription": {
    message: "구독 취소",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "구독을 취소하시겠습니까? 현재 청구 기간이 끝날 때까지 계속 액세스할 수 있습니다.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "구독을 취소하시겠습니까?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "취소 중...",
    description: "Button text while canceling subscription",
  },
  "userSettings.confirmCancel": {
    message: "예, 구독 취소",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.failedToCancelSubscription": {
    message: "구독 취소에 실패했습니다",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "구독 재개",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "구독을 재개할까요?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "구독을 재개하시겠어요? 구독이 계속 자동으로 갱신되며 현재 결제 기간이 끝나면 다시 청구됩니다.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "예, 구독 재개",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "재개 중...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "구독이 성공적으로 재개되었습니다",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "구독 재개에 실패했습니다",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "결제 세션 생성에 실패했습니다. 다시 시도해 주세요.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.manageBilling": {
    message: "청구 관리",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageActiveSession": {
    message: "활성 세션 관리",
    description: "Description for session section",
  },
  "userSettings.manageSubscription": {
    message: "구독 및 청구 관리",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "매월",
    description: "Monthly frequency option",
  },
  "userSettings.neverUsed": {
    message: "사용한 적 없음",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "새 SSH 키",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "SSH 키 없음",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "아직 SSH 키가 생성되지 않았습니다. 첫 번째 키를 생성하여 안전한 저장소 액세스를 시작하세요.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "설정되지 않음",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "열고 있는 중...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "공개 키",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      '여기에 공개 키 내용을 붙여넣으세요. "-----BEGIN PUBLIC KEY-----"로 시작해야 합니다.',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "공개 키는 필수입니다",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "갱신일",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "선호하는 색상 테마 선택",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "선호하는 언어 선택",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "세션",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "계정에서 로그아웃하고 세션을 지웁니다.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH 키",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "구독",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "구독이 취소되었습니다",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "구독이 성공적으로 취소되었습니다",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "구독이 성공적으로 업그레이드되었습니다",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "결제에 추가 인증이 필요합니다. 이메일 또는 카드 발급사를 확인해 주세요.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "시스템",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "테스트 모드",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "테마",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "다크",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "라이트",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "시스템",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "제목은 100자 미만이어야 합니다",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "제목은 필수입니다",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "청구 포털을 열 수 없습니다. 나중에 다시 시도해 주세요.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "알 수 없는 플랜",
    description: "Fallback when plan name is not available",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "사용자 이름이 성공적으로 업데이트되었습니다",
    description: "Success message after updating username",
  },
  "userSettings.userProfile": {
    message: "사용자 프로필",
    description: "Section title for user profile settings",
  },
  "userSettings.weekly": {
    message: "매주",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "예, 내 계정을 삭제합니다",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "내 계정 정보",
    description: "Description for user profile section",
  },
  "userSettings.firstName": {
    message: "이름",
    description: "Label for first name field",
  },
  "userSettings.lastName": {
    message: "성",
    description: "Label for last name field",
  },
  "userSettings.name": {
    message: "이름",
    description: "Label for combined name field",
  },
  "userSettings.changeName": {
    message: "이름 변경",
    description: "Dialog title for changing name",
  },
  "userSettings.enterNewName": {
    message: "아래에 이름을 입력하세요",
    description: "Instructions in change name dialog",
  },
  "userSettings.aiCfoUsage": {
    message: "AI 요청",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "이번 달 {used} / {max} 요청 사용됨",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "이번 달 {used} 요청 사용됨 (무제한)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.currentPlan": {
    message: "현재 플랜",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "무료 플랜",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "엔터프라이즈",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "사용량",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "원장",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} 원장",
    description: "Ledger usage count display",
  },
  "userSettings.upgradeYourPlan": {
    message: "플랜 업그레이드",
    description: "Section header for upgrade tier cards",
  },
  "userSettings.billing": {
    message: "청구",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "무제한",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/월",
    description: "Price interval suffix",
  },
};

export default koUserSettings;
