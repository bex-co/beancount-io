import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const zhUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.zh,
  "userSettings.accessUntil": {
    message: "访问截止日期",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "账户已成功删除",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "添加新密钥",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "已添加",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "所有上传的文档和附件",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "你所有的账本和交易历史",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "所有偏好设置",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "所有交易和记录",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "外观",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "取消订阅",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message: "你确定要取消订阅吗？你将继续拥有访问权限直到当前计费周期结束。",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "取消订阅？",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "正在取消...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "此操作无法撤销。",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "更改姓名",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "更改用户名",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "是的，取消订阅",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "创建密钥",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "创建新 API 密钥",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "添加新的公钥以通过 Beancount API 进行身份验证。",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "创建新密钥",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "创建中...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "当前语言",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "自定义应用程序的外观和感觉",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "危险区域",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "深色",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "删除账号",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: '请在下方输入你的用户名 "{username}" 以确认：',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "输入你的用户名",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "此操作无法撤销。这将永久删除你的账户并从我们的服务器中删除你的所有数据。",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "删除账户？",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message: "永久删除你的账户和所有关联数据。此操作无法撤销。",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "删除密钥",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "删除 SSH 密钥",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "你确定要删除密钥",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "删除中...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "请在下方输入你的姓名",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "在下方输入你的新用户名",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "输入新用户名",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "创建密钥错误",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "加载设置时出错",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "取消订阅失败",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "恢复订阅",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "恢复订阅？",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "确定要恢复订阅吗？订阅将继续自动续订，并会在当前计费周期结束时再次扣费。",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "是，恢复订阅",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "正在恢复...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "订阅已成功恢复",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "恢复订阅失败",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "创建结账会话失败。请重试。",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "加载密钥失败",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message: "加载 SSH 密钥时出错。请重试。",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "加载设置失败",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "加载订阅状态失败",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "名",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "以下内容将被永久删除：",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "通用",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "邀请",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "不可逆转的破坏性操作",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "密钥标题",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message: "此密钥的描述性名称，以帮助你稍后识别。",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "例如：我的开发密钥",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "姓",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "最近3个月内使用过",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "最近3周内使用过",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "3个月前使用过",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "最近一周内使用过",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "浅色",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "加载你的账户信息中...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "加载会话信息中...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "加载 SSH 密钥中...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "加载订阅详情中...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "加载主题偏好中...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "管理你的活动会话",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "管理账单",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "管理你的订阅和账单",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "每月",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "姓名",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "从未使用",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "新 SSH 密钥",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "无 SSH 密钥",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "你尚未创建任何 SSH 密钥。创建你的第一个密钥以开始安全的仓库访问。",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "未设置",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "正在打开...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "公钥",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message: '在此粘贴你的公钥内容。它应以 "-----BEGIN PUBLIC KEY-----" 开头。',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "公钥为必填项",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "续订日期",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "选择你偏好的颜色主题",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "选择你偏好的语言",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "会话",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "退出你的账户并清除会话。",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH 密钥",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "订阅",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "订阅已取消",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "订阅已成功取消",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "订阅已成功升级",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message: "你的付款需要额外验证。请检查你的电子邮件或联系发卡机构。",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "系统",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "测试模式",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "主题",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "深色",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "浅色",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "跟随系统",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "标题必须少于100个字符",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "标题为必填项",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "无法打开账单门户。请稍后重试。",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "未知计划",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "用户资料",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "用户名更新成功",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "每周",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "是的，删除我的账户",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "你的账户信息",
    description: "Description for user profile section",
  },
  "userSettings.aiCfoUsage": {
    message: "AI Tokens",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens used this month",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens used this month (Unlimited)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.currentPlan": {
    message: "Current Plan",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Free Plan",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Enterprise",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Usage",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Ledgers",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} ledgers",
    description: "Ledger usage count display",
  },
  "userSettings.upgradeYourPlan": {
    message: "Upgrade Your Plan",
    description: "Section header for upgrade tier cards",
  },
  "userSettings.billing": {
    message: "Billing",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Unlimited",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/month",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} AI 代币/月",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedLedgers": {
    message: "无限账本",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{count} 分类帐",
    description: "Ledger allowance for a subscription tier",
  },
  "userSettings.unlimitedDirectives": {
    message: "无限指令",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} 指令",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "无限合作者\n每个账本最多",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "个合作者 {count}",
    description: "Collaborator allowance for each ledger",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message: "你正在使用每月 AI 代币的 {percentage}%。升级以避免中断。",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "指纹",
    description: "Label for an SSH key fingerprint",
  },
};

export default zhUserSettings;
