import type { TranslationEntry } from "@/i18n";
import { apiKeyTranslations } from "../pages/api-keys/translations";

const jaUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.ja,
  "userSettings.accountDeleted": {
    message: "アカウントが正常に削除されました",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "新しいキーを追加",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "追加済み",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "アップロードされたすべてのドキュメントと添付ファイル",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "すべての元帳と取引履歴",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "すべての設定と環境設定",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "すべての取引と記録",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "外観",
    description: "Appearance settings section label",
  },
  "userSettings.cannotBeUndone": {
    message: "この操作は元に戻せません。",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeUsername": {
    message: "ユーザー名を変更",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "キーを作成",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "新しい SSH キーを作成",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Git リポジトリへのアクセス用に新しい SSH 公開鍵を追加します。",
    description:
      "Dialog description for creating an SSH public key for Git access",
  },
  "userSettings.createNewKey": {
    message: "新しいキーを作成",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "作成中...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "言語",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "アプリケーションの外観をカスタマイズ",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "危険ゾーン",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "ダーク",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "アカウントを削除",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: "確認のため、下にユーザー名「{username}」を入力してください：",
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "ユーザー名を入力",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "この操作は元に戻せません。アカウントが完全に削除され、すべてのデータがサーバーから削除されます。",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "アカウントを削除しますか？",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "アカウントとすべての関連データを完全に削除します。この操作は元に戻せません。",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "キーを削除",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "SSHキーを削除",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "このキーを削除してよろしいですか",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "削除中...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewUsername": {
    message: "下に新しいユーザー名を入力してください",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "新しいユーザー名を入力",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "キーの作成エラー",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "設定の読み込みエラー",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToLoadKeys": {
    message: "キーの読み込みに失敗しました",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "SSHキーの読み込み中にエラーが発生しました。もう一度お試しください。",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "設定の読み込みに失敗しました",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "サブスクリプションの状態の読み込みに失敗しました",
    description: "Error message when subscription fails to load",
  },
  "userSettings.followingWillBeDeleted": {
    message: "以下のデータが完全に削除されます：",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "一般",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "招待",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "元に戻せない破壊的な操作",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "キーのタイトル",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message: "後で識別しやすいように、このキーの説明的な名前を付けてください。",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "例：開発用キー",
    description: "Placeholder for key title input",
  },
  "userSettings.lastUsed3Months": {
    message: "直近3か月以内に使用",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "直近3週間以内に使用",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "3か月以上前に使用",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "直近1週間以内に使用",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "ライト",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "アカウント情報を読み込み中...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "セッション情報を読み込み中...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "SSHキーを読み込み中...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "サブスクリプションの詳細を読み込み中...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "テーマ設定を読み込み中...",
    description: "Loading message for theme settings",
  },
  "userSettings.cancelSubscription": {
    message: "サブスクリプションをキャンセル",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "キャンセル中...",
    description: "Button text while canceling subscription",
  },
  "userSettings.failedToCancelSubscription": {
    message: "サブスクリプションのキャンセルに失敗しました",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "サブスクリプションを再開",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "サブスクリプションを再開しますか？",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "サブスクリプションを再開してもよろしいですか？サブスクリプションは引き続き自動更新され、現在の請求期間の終了時に再度請求されます。",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "はい、サブスクリプションを再開します",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "再開中...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "サブスクリプションが正常に再開されました",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "サブスクリプションの再開に失敗しました",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message:
      "チェックアウトセッションの作成に失敗しました。もう一度お試しください。",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.manageBilling": {
    message: "請求を管理",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageActiveSession": {
    message: "アクティブなセッションを管理",
    description: "Description for session section",
  },
  "userSettings.manageSubscription": {
    message: "サブスクリプションと請求を管理",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "毎月",
    description: "Monthly frequency option",
  },
  "userSettings.neverUsed": {
    message: "未使用",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "新しいSSHキー",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "SSHキーなし",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "まだSSHキーが作成されていません。最初のキーを作成して、安全なリポジトリアクセスを始めましょう。",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "未設定",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "開いています...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "公開鍵",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "公開鍵をここに貼り付けてください。通常は ssh-ed25519 または ssh-rsa で始まり、cat ~/.ssh/id_ed25519.pub で表示できます。PEM 形式の公開鍵も使用できます。",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "公開鍵は必須です",
    description: "Validation error for missing public key",
  },
  "userSettings.startsOn": {
    message: "開始日",
    description: "Label for when a deferred Stripe plan starts",
  },
  "userSettings.renewsOn": {
    message: "更新日",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message:
      "App Store のプランは {date} に終了します。このプランはその時点で開始します。",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "Google Play のプランは {date} に終了します。このプランはその時点で開始します。",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "App Store のプランは {date} まで続き、このプランは本日請求されます。",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Google Play のプランは {date} まで続き、このプランは本日請求されます。",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Stripe で請求",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "App Store で請求",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Google Play で請求",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "iPhone または iPad で管理してください: 設定 → ユーザ名 → サブスクリプション。",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Google Play で管理",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "{date} に終了",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "{date} に {plan} へ変更",
    description: "Plan card: a store plan with a scheduled change",
  },
  "userSettings.selectColorTheme": {
    message: "お好みのカラーテーマを選択",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "お好みの言語を選択",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "セッション",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "アカウントからサインアウトし、セッションをクリアします。",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSHキー",
    description: "Page title for SSH keys",
  },
  "userSettings.subscriptionStatus.active": {
    message: "有効",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "後日開始",
    description:
      "Billing badge for a Stripe subscription waiting for a store plan to end before its first charge (ADR 001 D15). No plan is sold with a trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "支払い遅延",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "未払い",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "未完了",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "期限切れ",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "キャンセル済み",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "一時停止",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "サブスクリプション",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "サブスクリプションが正常にキャンセルされました",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "サブスクリプションが正常にアップグレードされました",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "システム",
    description: "System theme option",
  },
  "userSettings.theme": {
    message: "テーマ",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "ダーク",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "ライト",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "システム",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "タイトルは100文字未満にしてください",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "タイトルは必須です",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "請求ポータルを開けません。後でもう一度お試しください。",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "不明なプラン",
    description: "Fallback when plan name is not available",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "ユーザー名が正常に更新されました",
    description: "Success message after updating username",
  },
  "userSettings.userProfile": {
    message: "ユーザープロフィール",
    description: "Section title for user profile settings",
  },
  "userSettings.weekly": {
    message: "毎週",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "はい、アカウントを削除します",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "あなたのアカウント情報",
    description: "Description for user profile section",
  },
  "userSettings.firstName": {
    message: "名",
    description: "Label for first name field",
  },
  "userSettings.lastName": {
    message: "姓",
    description: "Label for last name field",
  },
  "userSettings.name": {
    message: "氏名",
    description: "Label for combined name field",
  },
  "userSettings.changeName": {
    message: "名前を変更",
    description: "Dialog title for changing name",
  },
  "userSettings.enterNewName": {
    message: "下に名前を入力してください",
    description: "Instructions in change name dialog",
  },
  "userSettings.aiCfoUsage": {
    message: "AIリクエスト",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "今月 {used} / {max} リクエスト使用済み",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "今月 {used} リクエスト使用済み（無制限）",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "現在、使用量を表示できません。",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "現在のプラン",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "無料プラン",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "エンタープライズ",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "使用状況",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "元帳",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} 元帳",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "請求",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "無制限",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/月",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} AI トークン / 月",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "無制限の AI トークン",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "無制限の台帳",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "元帳 {formattedCount} 件",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_other": {
    message: "元帳 {formattedCount} 件",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - the only form; this language has no plural inflection",
  },
  "userSettings.unlimitedDirectives": {
    message: "無制限のディレクティブ",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} ディレクティブ",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "無制限のコラボレーター",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "元帳ごとに最大 {formattedCount} 人の共同作業者",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "元帳ごとに最大 {formattedCount} 人の共同作業者",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - the only form; this language has no plural inflection",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "毎月の AI トークンの {percentage}% を使用しています。中断を避けるためにアップグレードしてください。",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "指紋",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "毎年",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "請求サイクル",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "プラン",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "年払いに切り替える",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "月払いに切り替える",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "ダウングレード",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "お問い合わせ",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "年額 {amount}",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "{percent}%お得",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "年払いなら年額 {yearly}（月払いでは {monthlyTotal}）で、毎年 {saving} お得です。",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/年",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "旧料金",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "お支払いを確認しています…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "{plan} をご利用中です",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message: "{date} に {amount} で更新されます。領収書はメールで届きます。",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "利用できるようになった内容: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "お支払いを受け付けました。1 分ほどでプランが反映されます。更新して確認してください。",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "更新",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "元のページに戻る",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "{plan} を使い始める",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "お支払いはキャンセルされました。請求は発生していません。",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "お支払い情報を見る",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "{plan} に変更",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "この変更の料金を計算しています…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "この変更の料金を計算できませんでした。もう一度お試しください。",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "本日から適用されます。",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "本日のお支払い",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "現在のプランの未使用期間分として {credit} のクレジットが含まれます。",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "以降は {amount}、次回のお支払いは {date} です。",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "{card} に請求されます",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "追加される内容",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "{amount} を支払って変更",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "お支払いに進む",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "今はしない",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "未使用期間は必ずクレジットされるため、二重に支払うことはありません。",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "すでにこのプランをご利用中です。",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "このプランを以前の安い料金でご利用中です。変更すると料金が上がるだけです。",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "アカウントに有効なサブスクリプションが複数あります。プランを変更するにはサポートにお問い合わせください。",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "変更できる有効なサブスクリプションがありません。ページを再読み込みしてプランを選択してください。",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "前回の更新のお支払いが完了しませんでした。「請求を管理」でお支払い方法を更新してから、プランを変更してください。",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message:
      "{date} から適用されます。それまでは {plan} をご利用いただけます。",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "本日のお支払いはありません。",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "{date} に変わること",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "元帳ごとの共同作業者",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "月あたりの AI トークン",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "現在 {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "すべての元帳はそのまま残り、引き続き使えます。新しい上限の {max} を下回るまで、新しい元帳は作成できません。",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "ダウングレードを予約",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "切り替えを予約",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "{plan} を継続",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "{date} に予約しました。それまでは何も変わりません。",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message:
      "{date} に予定されている {plan} への変更は、これに置き換わります。",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "解約も取り消され、サブスクリプションは継続します。",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message: "現在の料金はすでに提供終了のため、この変更で終了します。",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "月払いの {plan} は {date} の更新時から開始できます。今日から {plan} にしますか？",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "年払いで今日から {plan} — 今 {amount}",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "{date} に月払いの {plan} へ切り替え — 本日のお支払いなし",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "更新時に適用",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "含まれなくなる機能",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "ディレクティブ",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "予定",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "{date} に {plan} に変更されます。",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} は {date} に終了します。",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "現在のプランを継続",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "プランはそのままです。",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message:
      "予定されている変更を取り消せませんでした。もう一度お試しください。",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "{plan} を解約しますか？",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "{date} まで {plan} をご利用いただけます。その後は無料プランになります：{limits}。",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "帳簿はプレーンテキストなので、いつでもエクスポートできます。何も削除されません。",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "ほかの選択肢",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "年払いに切り替え — 月あたり {price}",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "{plan} にダウングレード",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "主な理由は何ですか？（任意）",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "高すぎる",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "機能が足りない",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "使っていない",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "別のツールに移る",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "その他",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "このお支払いには銀行の承認が必要です。承認されるまで何も変更されません。承認後、このページを更新してください。",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "銀行によるお支払いの承認を待っています…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "お支払いを承認する",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "銀行がお支払いを承認しませんでした。何も変更されていません。",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "別のカードを使う",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "自動バックアップ",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "高度な自動化と連携",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "OIDC によるシングルサインオン（SSO）",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "複数事業体の連結",
    description: "Plan feature from the pricing table",
  },
};

export default jaUserSettings;
