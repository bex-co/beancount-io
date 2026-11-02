import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const zhUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.zh,
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
  "userSettings.createKey": {
    message: "创建密钥",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "创建新 SSH 密钥",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "添加新的 SSH 公钥以访问 Git 仓库。",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
    message:
      "在此粘贴你的公钥。它通常以 ssh-ed25519 或 ssh-rsa 开头；可用 cat ~/.ssh/id_ed25519.pub 打印。也接受 PEM 格式的公钥。",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
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
  "userSettings.deferredStartAppStore": {
    message: "你的 App Store 计划将于 {date} 结束，此计划届时开始。",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message: "你的 Google Play 计划将于 {date} 结束，此计划届时开始。",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message: "你的 App Store 计划持续到 {date}，此计划今天开始扣款。",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message: "你的 Google Play 计划持续到 {date}，此计划今天开始扣款。",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "通过 Stripe 计费",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "通过 App Store 计费",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "通过 Google Play 计费",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message: "请在 iPhone 或 iPad 上管理：设置 → 你的姓名 → 订阅。",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "在 Google Play 上管理",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "{date} 结束",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "{date} 变更为 {plan}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.subscriptionStatus.active": {
    message: "有效",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "试用中",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "逾期未付",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "未支付",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "未完成",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "已过期",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "已取消",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "已暂停",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "订阅",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "订阅已成功取消",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "订阅已成功升级",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "系统",
    description: "System theme option",
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
    message: "AI 词元",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "本月已使用 {used} / {max} 词元",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "本月已使用 {used} 词元（无限制）",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "暂时无法显示用量。",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "当前计划",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "免费计划",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "企业版",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "用量",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "账本",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} 个账本",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "账单",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "无限制",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/月",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} AI 词元/月",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "无限 AI 词元",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "无限账本",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} 个账本",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} 个账本",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - the only form; this language has no plural inflection",
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
    message: "协作者人数不限",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "每个账本最多 {formattedCount} 位协作者",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "每个账本最多 {formattedCount} 位协作者",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - the only form; this language has no plural inflection",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message: "你正在使用每月 AI 词元的 {percentage}%。升级以避免中断。",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "指纹",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "每年",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "计费周期",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "计划",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "改为按年付费",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "改为按月付费",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "降级",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "联系我们",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "按年计费 {amount}",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "节省 {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "按年付费：每年 {yearly}，而不是 {monthlyTotal}，每年节省 {saving}。",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/年",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "旧价格",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "正在确认你的付款…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "你现在使用的是 {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message: "将于 {date} 以 {amount} 续订。收据会通过电子邮件发送给你。",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "现已包含：{limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message: "已收到付款。你的计划将在一分钟内显示；请刷新查看。",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "刷新",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "返回之前的页面",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "开始使用 {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "已取消付款，未产生任何扣费。",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "查看账单",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "改为 {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "正在计算此变更的费用…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "无法计算此变更的费用。请重试。",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "今天生效。",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "今日应付",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message: "包含当前计划未使用时间的 {credit} 抵扣。",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "之后为 {amount}，下次扣款日期为 {date}。",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "从 {card} 扣款",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "你将获得",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "支付 {amount} 并更改",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "继续付款",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "暂不",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message: "未使用的时间始终会被抵扣，你绝不会重复付费。",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "你已经在使用此计划。",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message: "你以较早的更低价格保留此计划；更改只会让价格上涨。",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message: "你的账户有多个有效订阅。请联系支持团队更改计划。",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message: "没有可更改的有效订阅。请刷新页面并选择一个计划。",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "你上次的续订付款未成功。请先在“管理账单”中更新付款方式，再更改计划。",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "{date} 起生效。在此之前你仍保留 {plan}。",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "今天无需付款。",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "{date} 起的变化",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "每个账本的协作者",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "每月 AI 词元",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "你现有 {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "你的所有账本都会保留并继续正常使用。在低于新的上限 {max} 之前，无法创建新的账本。",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "安排降级",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "安排切换",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "保留 {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "已安排在 {date}。在此之前一切不变。",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "这将替换你原定于 {date} 更改为 {plan} 的安排。",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "这也会撤回你的取消，订阅将继续。",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message: "你当前的价格已不再提供，将随此次更改结束。",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message: "按月付费的 {plan} 可在 {date} 续订时开始。想今天就用 {plan} 吗？",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "今天起以年付方式使用 {plan} —— 现在支付 {amount}",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "{date} 起切换为按月付费的 {plan} —— 今天无需付款",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "在续订时生效",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "不再包含",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "指令",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "已安排",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "将于 {date} 更改为 {plan}。",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} 将于 {date} 结束。",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "保持当前计划",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "你的计划保持不变。",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "无法撤销你已安排的更改。请重试。",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "取消 {plan}？",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message: "你可以使用 {plan} 至 {date}。之后将转为免费计划：{limits}。",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message: "你的账本是纯文本——随时可以导出。不会删除任何内容。",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "其他选择",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "改为年付——每月 {price}",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "降级到 {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "主要原因是什么？（可选）",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "太贵了",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "缺少某个功能",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "没有在用",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "换用其他工具",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "其他",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "你的银行需要批准此付款。批准前不会有任何变更；批准后请刷新此页面。",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "正在等待你的银行批准此付款…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "批准付款",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "你的银行没有批准此付款。未做任何更改。",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "使用其他卡",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "自动备份",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "高级自动化与集成",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "基于 OIDC 的单点登录（SSO）",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "多实体合并",
    description: "Plan feature from the pricing table",
  },
};

export default zhUserSettings;
