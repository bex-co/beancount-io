import type { TranslationEntry } from "@/i18n";
import { apiKeyTranslations } from "../pages/api-keys/translations";

const koUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.ko,
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
    message: "새 SSH 키 만들기",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Git 저장소 접근을 위한 새 SSH 공개 키를 추가합니다.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
  "userSettings.cancelSubscription": {
    message: "구독 취소",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "취소 중...",
    description: "Button text while canceling subscription",
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
      "여기에 공개 키를 붙여넣으세요. 보통 ssh-ed25519 또는 ssh-rsa로 시작하며 cat ~/.ssh/id_ed25519.pub로 출력할 수 있습니다. PEM 공개 키도 사용할 수 있습니다.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
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
  "userSettings.deferredStartAppStore": {
    message: "App Store 플랜은 {date}에 종료됩니다. 이 플랜은 그때 시작됩니다.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "Google Play 플랜은 {date}에 종료됩니다. 이 플랜은 그때 시작됩니다.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message: "App Store 플랜은 {date}까지 유지되며 이 플랜은 오늘 청구됩니다.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Google Play 플랜은 {date}까지 유지되며 이 플랜은 오늘 청구됩니다.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Stripe로 청구",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "App Store로 청구",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Google Play로 청구",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message: "iPhone 또는 iPad에서 관리하세요: 설정 → 사용자 이름 → 구독.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Google Play에서 관리",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "{date}에 종료",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "{date}에 {plan}(으)로 변경",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.subscriptionStatus.active": {
    message: "활성",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "체험",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "결제 연체",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "미납",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "미완료",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "만료",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "취소됨",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "일시 정지",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "구독",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "구독이 성공적으로 취소되었습니다",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "구독이 성공적으로 업그레이드되었습니다",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "시스템",
    description: "System theme option",
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
  "userSettings.aiCfoUsageUnavailable": {
    message: "지금은 사용량을 표시할 수 없습니다.",
    description: "Shown in place of AI token usage when its read fails",
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
  "userSettings.aiTokensPerMonth": {
    message: "{count} AI 토큰/월",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "무제한 AI 토큰",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "무제한 원장",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "원장 {formattedCount}개",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_other": {
    message: "원장 {formattedCount}개",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - the only form; this language has no plural inflection",
  },
  "userSettings.unlimitedDirectives": {
    message: "무제한 지시어",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} 지시어",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "무제한 공동작업자",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "원장당 최대 {formattedCount}명의 협업자",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "원장당 최대 {formattedCount}명의 협업자",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - the only form; this language has no plural inflection",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "귀하는 월간 AI 토큰의 {percentage}%를 사용하고 있습니다. 중단을 방지하려면 업그레이드하세요.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "지문",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "매년",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "결제 주기",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "플랜",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "연간 결제로 전환",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "월간 결제로 전환",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "다운그레이드",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "문의하기",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "연 {amount} 청구",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "{percent}% 절약",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "연간 결제: 월간 결제 시 {monthlyTotal} 대신 연 {yearly} — 매년 {saving} 절약됩니다.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/년",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "이전 요금",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "결제를 확인하는 중…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "이제 {plan} 플랜을 사용합니다",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "{date}에 {amount}(으)로 갱신됩니다. 영수증은 이메일로 받으실 수 있습니다.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "이제 포함된 항목: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "결제가 완료되었습니다. 1분 안에 플랜이 표시됩니다. 새로고침해 확인하세요.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "새로고침",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "이전 페이지로 돌아가기",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "{plan} 사용 시작하기",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "결제가 취소되었습니다. 청구된 금액은 없습니다.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "결제 정보 보기",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "{plan}(으)로 변경",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "이 변경의 요금을 계산하는 중…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "이 변경의 요금을 계산하지 못했습니다. 다시 시도해 주세요.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "오늘부터 적용됩니다.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "오늘 결제 금액",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message: "현재 플랜의 미사용 기간에 대한 {credit} 크레딧이 포함됩니다.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "이후 {amount}, 다음 결제일은 {date}입니다.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "{card}(으)로 결제",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "추가되는 혜택",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "{amount} 결제 후 변경",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "결제로 계속",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "나중에",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "미사용 기간은 항상 크레딧으로 처리되므로 두 번 결제하지 않습니다.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "이미 이 플랜을 사용 중입니다.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "이 플랜을 이전의 더 낮은 요금으로 사용 중입니다. 변경하면 요금만 오릅니다.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "계정에 활성 구독이 두 개 이상 있습니다. 플랜을 변경하려면 지원팀에 문의하세요.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "변경할 활성 구독이 없습니다. 페이지를 새로고침한 후 플랜을 선택하세요.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "마지막 갱신 결제가 처리되지 않았습니다. 청구 관리에서 결제 수단을 업데이트한 후 플랜을 변경하세요.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "{date}부터 적용됩니다. 그때까지 {plan}을(를) 유지합니다.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "오늘 결제할 금액은 없습니다.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "{date}에 바뀌는 내용",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "원장당 협업자",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "월별 AI 토큰",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "현재 {count}개",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "모든 원장은 그대로 남아 계속 작동합니다. 새 한도인 {max} 미만이 될 때까지 새 원장을 만들 수 없습니다.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "다운그레이드 예약",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "전환 예약",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "{plan} 유지",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "{date}로 예약되었습니다. 그때까지는 아무것도 바뀌지 않습니다.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "{date}에 예정된 {plan}(으)로의 변경을 대체합니다.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "구독 해지도 철회되어 구독이 계속됩니다.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message: "현재 가격은 더 이상 제공되지 않아 이번 변경과 함께 종료됩니다.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "월간 결제 {plan}은(는) {date} 갱신 시점부터 시작할 수 있습니다. 오늘부터 {plan}을(를) 원하시나요?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "연간 결제로 오늘부터 {plan} — 지금 {amount}",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "{date}에 월간 {plan}(으)로 전환 — 오늘은 결제 없음",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "갱신 시 적용",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "더 이상 포함되지 않음",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "지시어",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "예정됨",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "{date}에 {plan}(으)로 변경됩니다.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan}이(가) {date}에 종료됩니다.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "현재 플랜 유지",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "플랜이 그대로 유지됩니다.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "예정된 변경을 취소하지 못했습니다. 다시 시도하세요.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "{plan}을(를) 해지할까요?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "{date}까지 {plan}을(를) 이용할 수 있습니다. 그 후에는 무료 플랜으로 전환됩니다: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "장부는 일반 텍스트이므로 언제든 내보낼 수 있습니다. 아무것도 삭제되지 않습니다.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "다른 선택지",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "연간 결제로 전환 — 월 {price}",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "{plan}(으)로 다운그레이드",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "주된 이유는 무엇인가요? (선택)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "너무 비쌈",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "필요한 기능이 없음",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "사용하지 않음",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "다른 도구로 옮김",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "기타",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "은행에서 이 결제를 승인해야 합니다. 승인 전에는 아무것도 바뀌지 않습니다. 승인한 후 이 페이지를 새로고침하세요.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "은행의 결제 승인을 기다리는 중…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "결제 승인",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "은행에서 결제를 승인하지 않았습니다. 변경된 사항이 없습니다.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "다른 카드 사용",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "자동 백업",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "고급 자동화 및 연동",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "OIDC 기반 통합 인증(SSO)",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "여러 법인 통합",
    description: "Plan feature from the pricing table",
  },
};

export default koUserSettings;
