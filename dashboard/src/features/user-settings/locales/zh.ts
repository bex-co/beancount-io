export interface TranslationEntry {
  message: string;
  description: string;
}

const zhUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accessUntil": {
    message: "访问截止日期",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "账户已成功删除",
    description: "Success message when account is deleted",
  },
  "userSettings.accountSettings": {
    message: "账户",
    description: "Section header for account settings",
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
  "userSettings.appSettings": {
    message: "应用设置",
    description: "Section header for application settings",
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
  "userSettings.changeLanguage": {
    message: "更改",
    description: "Button to change language",
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
  "userSettings.currentPeriodEnds": {
    message: "当前周期结束",
    description: "Label for subscription period end date",
  },
  "userSettings.currentVersion": {
    message: "当前版本",
    description: "Label showing current app version",
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
  "userSettings.deleteAccountAlertCancel": {
    message: "取消",
    description: "Cancel button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertConfirm": {
    message: "删除账号",
    description: "Confirm button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertMsg": {
    message: "你确定要删除你的账户吗？此操作无法撤销，将永久删除你的所有数据。",
    description: "Warning message in account deletion confirmation dialog",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: '请在下方输入你的用户名 "{username}" 以确认：',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPhrase": {
    message: "sudo delete my account",
    description: "Exact phrase user must type to confirm deletion",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "输入你的用户名",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountConfirmTitle": {
    message: "确认删除账号",
    description: "Title of account deletion confirmation step",
  },
  "userSettings.deleteAccountDescription": {
    message: "永久删除账号和数据",
    description: "Description of what account deletion does",
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
  "userSettings.failedToCreateKey": {
    message: "创建密钥失败。请重试。",
    description: "Error message when key creation fails",
  },
  "userSettings.failedToDeleteAccount": {
    message: "删除账户失败",
    description: "Error message when account deletion fails",
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
  "userSettings.helpCenter": {
    message: "帮助中心",
    description: "Link to help center",
  },
  "userSettings.inputKeyword": {
    message: "请输入关键字",
    description: "Placeholder prompting user to enter keyword",
  },
  "userSettings.invite": {
    message: "邀请",
    description: "Invite action button",
  },
  "userSettings.inviteFriends": {
    message: "邀请好友",
    description: "Button or section title for inviting friends",
  },
  "userSettings.inviteSummary": {
    message: "分享这款专业的财务管理工具，帮助他人建立稳健的财务未来。",
    description: "Summary description of invite feature",
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
  "userSettings.loadingAccountOptions": {
    message: "加载账户选项中...",
    description: "Loading message for account options",
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
  "userSettings.manage": {
    message: "管理",
    description: "Button to manage subscription",
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
  "userSettings.noActiveSubscription": {
    message: "无活跃订阅",
    description: "Label when user has no subscription",
  },
  "userSettings.noContactPermission": {
    message: "没有访问通讯录的权限.",
    description: "Error when contacts permission is denied",
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
  "userSettings.off": {
    message: "关闭",
    description: "Off state for toggles or subscriptions",
  },
  "userSettings.opening": {
    message: "正在打开...",
    description: "Button text while opening billing portal",
  },
  "userSettings.processing": {
    message: "正在处理...",
    description: "Button text while processing checkout",
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
  "userSettings.recommend": {
    message: "我想分享这个专业的财务管理工具，它帮助我有效地整理了财务。",
    description: "Pre-written recommendation message for sharing",
  },
  "userSettings.referral": {
    message: "推荐",
    description: "Referral program label",
  },
  "userSettings.renewsOn": {
    message: "续订日期",
    description: "Label for subscription renewal date",
  },
  "userSettings.reviewApp": {
    message: "给个好评鼓励一下",
    description: "Prompt to review the app",
  },
  "userSettings.rewardDetail": {
    message: "分享这款专业的财务管理工具，帮助他人建立稳健的财务未来。",
    description: "Detailed description of referral rewards",
  },
  "userSettings.rewardSummary": {
    message: "邀请好友",
    description: "Summary of referral rewards",
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
  "userSettings.settingsErrorMessage": {
    message: "加载设置时出错。请检查你的连接后重试。",
    description: "Detailed error message for settings loading failure",
  },
  "userSettings.shareError": {
    message: "分享失败",
    description: "Error message when sharing fails",
  },
  "userSettings.signOutDescription": {
    message: "退出你的账户并清除会话。",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH 密钥",
    description: "Page title for SSH keys",
  },
  "userSettings.subscribe": {
    message: "订阅",
    description: "Email report subscription feature label",
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
  "userSettings.supportSettings": {
    message: "支持",
    description: "Section header for support settings",
  },
  "userSettings.system": {
    message: "系统",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "测试模式",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.thanksShare": {
    message: "感谢分享!!",
    description: "Thank you message after sharing",
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
  "userSettings.trialProPlan": {
    message: "升级至高级版",
    description: "Button text for premium subscription upgrade",
  },
  "userSettings.trialProPlanComingSoon": {
    message: "试用专业版计划功能即将推出！",
    description: "Toast message when trial Pro plan is clicked",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "无法打开账单门户。请稍后重试。",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "未知计划",
    description: "Fallback when plan name is not available",
  },
  "userSettings.updateFailed": {
    message: "更新订阅失败",
    description: "Error message when update fails",
  },
  "userSettings.updateSuccess": {
    message: "更新订阅成功",
    description: "Success message after updating subscription",
  },
  "userSettings.upgradeToProDescription": {
    message: "升级到专业版以解锁高级功能和无限访问。",
    description: "Description encouraging subscription upgrade",
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
  "userSettings.aiCfoUsageDescription": {
    message: "Monthly AI token usage for your current billing period",
    description: "Description for AI CFO usage section",
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
  "userSettings.customPricing": {
    message: "Custom pricing",
    description: "Price label for enterprise tier",
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
  "userSettings.collaboratorLimit": {
    message: "Up to {max} collaborators per ledger",
    description: "Collaborator limit description",
  },
  "userSettings.collaboratorLimitUnlimited": {
    message: "Unlimited collaborators per ledger",
    description: "Collaborator limit for unlimited tiers",
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
  "userSettings.planFeatureSummary": {
    message:
      "{tokens} AI tokens · {ledgers} ledgers · {collaborators} collaborators",
    description: "Summary of plan features in the current plan banner",
  },
};

export default zhUserSettings;
