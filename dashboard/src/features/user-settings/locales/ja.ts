import type { TranslationEntry } from "@/i18n";

const jaUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accessUntil": {
    message: "アクセス期限",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "アカウントが正常に削除されました",
    description: "Success message when account is deleted",
  },
  "userSettings.accountSettings": {
    message: "アカウント",
    description: "Section header for account settings",
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
  "userSettings.appSettings": {
    message: "アプリ設定",
    description: "Section header for application settings",
  },
  "userSettings.appearance": {
    message: "外観",
    description: "Appearance settings section label",
  },
  "userSettings.cannotBeUndone": {
    message: "この操作は元に戻せません。",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeLanguage": {
    message: "変更",
    description: "Button to change language",
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
    message: "新しいAPIキーを作成",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Beancount APIで認証するための新しい公開鍵を追加します。",
    description: "Dialog description for creating API key",
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
  "userSettings.currentPeriodEnds": {
    message: "現在の期間終了日",
    description: "Label for subscription period end date",
  },
  "userSettings.currentVersion": {
    message: "バージョン",
    description: "Label showing current app version",
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
  "userSettings.deleteAccountAlertCancel": {
    message: "キャンセル",
    description: "Cancel button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertConfirm": {
    message: "アカウントを削除",
    description: "Confirm button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertMsg": {
    message:
      "アカウントを削除してよろしいですか？この操作は元に戻せず、すべてのデータが完全に削除されます。",
    description: "Warning message in account deletion confirmation dialog",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: "確認のため、下にユーザー名「{username}」を入力してください：",
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPhrase": {
    message: "sudo delete my account",
    description: "Exact phrase user must type to confirm deletion",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "ユーザー名を入力",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountConfirmTitle": {
    message: "アカウント削除の確認",
    description: "Title of account deletion confirmation step",
  },
  "userSettings.deleteAccountDescription": {
    message: "アカウントとデータを完全に削除",
    description: "Description of what account deletion does",
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
  "userSettings.failedToCreateKey": {
    message: "キーの作成に失敗しました。もう一度お試しください。",
    description: "Error message when key creation fails",
  },
  "userSettings.failedToDeleteAccount": {
    message: "アカウントの削除に失敗しました",
    description: "Error message when account deletion fails",
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
  "userSettings.helpCenter": {
    message: "ヘルプセンター",
    description: "Link to help center",
  },
  "userSettings.inputKeyword": {
    message: "キーワードを入力してください",
    description: "Placeholder prompting user to enter keyword",
  },
  "userSettings.invite": {
    message: "招待",
    description: "Invite action button",
  },
  "userSettings.inviteFriends": {
    message: "友達を招待",
    description: "Button or section title for inviting friends",
  },
  "userSettings.inviteSummary": {
    message:
      "このプロフェッショナルな財務管理ツールを共有して、他の人が財務の未来を築く手助けをしましょう。",
    description: "Summary description of invite feature",
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
  "userSettings.loadingAccountOptions": {
    message: "アカウントオプションを読み込み中...",
    description: "Loading message for account options",
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
  "userSettings.cancelSubscriptionDescription": {
    message:
      "サブスクリプションをキャンセルしてよろしいですか？現在の請求期間が終了するまでアクセスを継続できます。",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "サブスクリプションをキャンセルしますか？",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "キャンセル中...",
    description: "Button text while canceling subscription",
  },
  "userSettings.confirmCancel": {
    message: "はい、キャンセルする",
    description: "Button text to confirm subscription cancellation",
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
    message: "[TODO] Resume Subscription?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "[TODO] Are you sure you want to resume your subscription? Your subscription will continue to renew automatically and you will be billed again at the end of your current billing period.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "[TODO] Yes, Resume Subscription",
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
  "userSettings.manage": {
    message: "管理",
    description: "Button to manage subscription",
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
  "userSettings.noActiveSubscription": {
    message: "アクティブなサブスクリプションなし",
    description: "Label when user has no subscription",
  },
  "userSettings.noContactPermission": {
    message: "連絡先へのアクセス権限がありません。",
    description: "Error when contacts permission is denied",
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
  "userSettings.off": {
    message: "オフ",
    description: "Off state for toggles or subscriptions",
  },
  "userSettings.opening": {
    message: "開いています...",
    description: "Button text while opening billing portal",
  },
  "userSettings.processing": {
    message: "処理中...",
    description: "Button text while processing checkout",
  },
  "userSettings.publicKey": {
    message: "公開鍵",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "公開鍵の内容をここに貼り付けてください。「-----BEGIN PUBLIC KEY-----」で始まる必要があります。",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "公開鍵は必須です",
    description: "Validation error for missing public key",
  },
  "userSettings.recommend": {
    message:
      "財務を効果的に整理するのに役立っているプロフェッショナルな財務管理ツールをご紹介したいと思います。",
    description: "Pre-written recommendation message for sharing",
  },
  "userSettings.referral": {
    message: "紹介",
    description: "Referral program label",
  },
  "userSettings.renewsOn": {
    message: "更新日",
    description: "Label for subscription renewal date",
  },
  "userSettings.reviewApp": {
    message: "気に入りましたか？レビューをお願いします :)",
    description: "Prompt to review the app",
  },
  "userSettings.rewardDetail": {
    message:
      "このプロフェッショナルな財務管理ツールを共有して、他の人が財務の未来を築く手助けをしましょう。",
    description: "Detailed description of referral rewards",
  },
  "userSettings.rewardSummary": {
    message: "友達を招待",
    description: "Summary of referral rewards",
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
  "userSettings.settingsErrorMessage": {
    message:
      "設定の読み込みエラーが発生しました。接続を確認してもう一度お試しください。",
    description: "Detailed error message for settings loading failure",
  },
  "userSettings.shareError": {
    message: "共有に失敗しました",
    description: "Error message when sharing fails",
  },
  "userSettings.signOutDescription": {
    message: "アカウントからサインアウトし、セッションをクリアします。",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSHキー",
    description: "Page title for SSH keys",
  },
  "userSettings.subscribe": {
    message: "メールレポート",
    description: "Email report subscription feature label",
  },
  "userSettings.subscription": {
    message: "サブスクリプション",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "サブスクリプションがキャンセルされました",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "サブスクリプションが正常にキャンセルされました",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "サブスクリプションが正常にアップグレードされました",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "お支払いには追加認証が必要です。メールまたはカード発行会社をご確認ください。",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.supportSettings": {
    message: "サポート",
    description: "Section header for support settings",
  },
  "userSettings.system": {
    message: "システム",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "テストモード",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.thanksShare": {
    message: "シェアありがとうございます！！",
    description: "Thank you message after sharing",
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
  "userSettings.trialProPlan": {
    message: "プレミアムにアップグレード",
    description: "Button text for premium subscription upgrade",
  },
  "userSettings.trialProPlanComingSoon": {
    message: "トライアルプロプラン機能は近日公開予定！",
    description: "Toast message when trial Pro plan is clicked",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "請求ポータルを開けません。後でもう一度お試しください。",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "不明なプラン",
    description: "Fallback when plan name is not available",
  },
  "userSettings.updateFailed": {
    message: "サブスクリプションの更新に失敗しました",
    description: "Error message when update fails",
  },
  "userSettings.updateSuccess": {
    message: "サブスクリプションが正常に更新されました",
    description: "Success message after updating subscription",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "ユーザー名が正常に更新されました",
    description: "Success message after updating username",
  },
  "userSettings.upgradeToProDescription": {
    message:
      "プロにアップグレードしてプレミアム機能と無制限アクセスを解放しましょう。",
    description: "Description encouraging subscription upgrade",
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
  "userSettings.aiCfoUsageDescription": {
    message: "現在の請求期間における月間AIリクエスト使用量",
    description: "Description for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "今月 {used} / {max} リクエスト使用済み",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "今月 {used} リクエスト使用済み（無制限）",
    description: "AI CFO usage display for unlimited tier",
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
  "userSettings.customPricing": {
    message: "カスタム価格",
    description: "Price label for enterprise tier",
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
  "userSettings.collaboratorLimit": {
    message: "元帳あたり最大 {max} 名のコラボレーター",
    description: "Collaborator limit description",
  },
  "userSettings.collaboratorLimitUnlimited": {
    message: "元帳あたりコラボレーター数無制限",
    description: "Collaborator limit for unlimited tiers",
  },
  "userSettings.upgradeYourPlan": {
    message: "プランをアップグレード",
    description: "Section header for upgrade tier cards",
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
  "userSettings.planFeatureSummary": {
    message:
      "{tokens} AIトークン · {ledgers} 元帳 · {collaborators} コラボレーター",
    description: "Summary of plan features in the current plan banner",
  },
};

export default jaUserSettings;
