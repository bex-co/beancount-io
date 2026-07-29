export interface TranslationEntry {
  message: string;
  description: string;
}

const ruUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accessUntil": {
    message: "Доступ до",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Счёт deleted successfully",
    description: "Success message when account is deleted",
  },
  "userSettings.accountSettings": {
    message: "Аккаунт",
    description: "Section header for account settings",
  },
  "userSettings.addNewKey": {
    message: "Добавить новый ключ",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Добавлен",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Все загруженные документы и вложения",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Все ваши главные книги и история транзакций",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Все предпочтения и настройки",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Все транзакции и записи",
    description: "Item in delete account list",
  },
  "userSettings.appSettings": {
    message: "Настройки приложения",
    description: "Section header for application settings",
  },
  "userSettings.appearance": {
    message: "Внешний вид",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Отменить подписку",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Вы уверены, что хотите отменить подписку? У вас сохранится доступ до конца текущего платежного периода.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Отменить подписку?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Отмена...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Это действие нельзя отменить.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeLanguage": {
    message: "Изменить",
    description: "Button to change language",
  },
  "userSettings.changeName": {
    message: "Изменить имя",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Изменить Username",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Да, отменить подписку",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Создать ключ",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Создать новый API-ключ",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Добавьте новый публичный ключ для аутентификации в API Beancount.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Создать новый ключ",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Создание...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Язык",
    description: "Label showing current language selection",
  },
  "userSettings.currentPeriodEnds": {
    message: "Текущий период заканчивается",
    description: "Label for subscription period end date",
  },
  "userSettings.currentVersion": {
    message: "Версия",
    description: "Label showing current app version",
  },
  "userSettings.customizeAppearance": {
    message: "Настройте внешний вид и стиль приложения",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Опасная зона",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Тёмная",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Удалить аккаунт",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountAlertCancel": {
    message: "Отмена",
    description: "Cancel button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertConfirm": {
    message: "Удалить аккаунт",
    description: "Confirm button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertMsg": {
    message:
      "Вы уверены, что хотите удалить учётную запись? Это действие нельзя отменить, и все ваши данные будут удалены безвозвратно.",
    description: "Warning message in account deletion confirmation dialog",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Для подтверждения введите ваше имя пользователя "{username}" ниже:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPhrase": {
    message: "sudo delete my account",
    description: "Exact phrase user must type to confirm deletion",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Введите ваше имя пользователя",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountConfirmTitle": {
    message: "Подтвердить удаление аккаунта",
    description: "Title of account deletion confirmation step",
  },
  "userSettings.deleteAccountDescription": {
    message: "Навсегда удалить аккаунт и данные",
    description: "Description of what account deletion does",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Это действие нельзя отменить. This will permanently delete your account and remove all your data from our servers.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Удалить Account?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Навсегда удалить учётную запись и все связанные данные. Это действие нельзя отменить.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Удалить Key",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Удалить SSH Key",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Вы уверены, что хотите удалить ключ",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Удаление...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Введите ваше имя ниже",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Введите новое имя пользователя ниже",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Введите новое имя пользователя",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Ошибка создания ключа",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Ошибка загрузки настроек",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Не удалось отменить подписку",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Возобновить подписку",
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
    message: "Возобновление...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Подписка успешно возобновлена",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Не удалось возобновить подписку",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Не удалось создать сеанс оплаты. Пожалуйста, попробуйте еще раз.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToCreateKey": {
    message: "Не удалось создать ключ. Пожалуйста, попробуйте еще раз.",
    description: "Error message when key creation fails",
  },
  "userSettings.failedToDeleteAccount": {
    message: "Не удалось удалить учётную запись",
    description: "Error message when account deletion fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Не удалось загрузить ключи",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Произошла ошибка при загрузке SSH-ключей. Пожалуйста, попробуйте снова.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Не удалось загрузить настройки",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Не удалось загрузить статус подписки",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Имя",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Будет безвозвратно удалено следующее:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Общие",
    description: "General settings section label",
  },
  "userSettings.helpCenter": {
    message: "Справочный центр",
    description: "Link to help center",
  },
  "userSettings.inputKeyword": {
    message: "Пожалуйста, введите ключевое слово",
    description: "Placeholder prompting user to enter keyword",
  },
  "userSettings.invite": {
    message: "Пригласить",
    description: "Invite action button",
  },
  "userSettings.inviteFriends": {
    message: "Пригласить друзей",
    description: "Button or section title for inviting friends",
  },
  "userSettings.inviteSummary": {
    message:
      "Поделитесь этим профессиональным инструментом финансового управления и помогите другим построить своё финансовое будущее.",
    description: "Summary description of invite feature",
  },
  "userSettings.irreversibleActions": {
    message: "Необратимые и разрушительные действия",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Название ключа",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Описательное название для этого ключа, чтобы помочь вам идентифицировать его позже.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "например, Мой ключ разработки",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Фамилия",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Последнее использование в течение последних 3 месяцев",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Последнее использование в течение последних 3 недель",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Последнее использование более 3 месяцев назад",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Последнее использование в течение последней недели",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Светлая",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Загрузка информации об учётной записи...",
    description: "Loading message for account information",
  },
  "userSettings.loadingAccountOptions": {
    message: "Загрузка параметров учётной записи...",
    description: "Loading message for account options",
  },
  "userSettings.loadingSessionInformation": {
    message: "Загрузка информации о сессии...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Загрузка ваших SSH-ключей...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Загрузка деталей подписки...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Загрузка настроек темы...",
    description: "Loading message for theme settings",
  },
  "userSettings.manage": {
    message: "Управление",
    description: "Button to manage subscription",
  },
  "userSettings.manageActiveSession": {
    message: "Управление your active session",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Управление платежами",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Управление your subscription and billing",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Ежемесячно",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Имя",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Никогда не использовался",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Новый SSH-ключ",
    description: "Button text to create new SSH key",
  },
  "userSettings.noActiveSubscription": {
    message: "Нет активной подписки",
    description: "Label when user has no subscription",
  },
  "userSettings.noContactPermission": {
    message: "Отсутствует разрешение на доступ к контактам.",
    description: "Error when contacts permission is denied",
  },
  "userSettings.noSshKeys": {
    message: "Нет SSH-ключей",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Вы ещё не создали SSH-ключей. Создайте первый ключ для безопасного доступа к репозиторию.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Не установлено",
    description: "Placeholder when a field has no value",
  },
  "userSettings.off": {
    message: "Выключено",
    description: "Off state for toggles or subscriptions",
  },
  "userSettings.opening": {
    message: "Открытие...",
    description: "Button text while opening billing portal",
  },
  "userSettings.processing": {
    message: "Обработка...",
    description: "Button text while processing checkout",
  },
  "userSettings.publicKey": {
    message: "Публичный ключ",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Вставьте содержимое публичного ключа здесь. Он должен начинаться с "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Публичный ключ обязателен",
    description: "Validation error for missing public key",
  },
  "userSettings.recommend": {
    message:
      "Я хотел бы поделиться этим профессиональным инструментом управления финансами, который помог мне эффективно организовать мои финансы.",
    description: "Pre-written recommendation message for sharing",
  },
  "userSettings.referral": {
    message: "Рекомендация",
    description: "Referral program label",
  },
  "userSettings.renewsOn": {
    message: "Продлевается",
    description: "Label for subscription renewal date",
  },
  "userSettings.reviewApp": {
    message: "Нравится? Оставьте отзыв :)",
    description: "Prompt to review the app",
  },
  "userSettings.rewardDetail": {
    message:
      "Поделитесь этим профессиональным инструментом финансового управления и помогите другим построить своё финансовое будущее.",
    description: "Detailed description of referral rewards",
  },
  "userSettings.rewardSummary": {
    message: "Пригласить друзей",
    description: "Summary of referral rewards",
  },
  "userSettings.selectColorTheme": {
    message: "Выберите предпочитаемую цветовую тему",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Выберите предпочитаемый язык",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Сессия",
    description: "Session management section title",
  },
  "userSettings.settingsErrorMessage": {
    message:
      "Произошла ошибка при загрузке настроек. Пожалуйста, проверьте подключение и попробуйте снова.",
    description: "Detailed error message for settings loading failure",
  },
  "userSettings.shareError": {
    message: "Ошибка при отправке",
    description: "Error message when sharing fails",
  },
  "userSettings.signOutDescription": {
    message: "Выйти из учётной записи и очистить сессию.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH-ключи",
    description: "Page title for SSH keys",
  },
  "userSettings.subscribe": {
    message: "Отчёт по почте",
    description: "Email report subscription feature label",
  },
  "userSettings.subscription": {
    message: "Подписка",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Подписка отменена",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Подписка успешно отменена",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Подписка успешно обновлена",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Ваш платёж требует дополнительной аутентификации. Пожалуйста, проверьте электронную почту или свяжитесь с эмитентом карты.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.supportSettings": {
    message: "Поддержка",
    description: "Section header for support settings",
  },
  "userSettings.system": {
    message: "Системная",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Тестовый режим",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.thanksShare": {
    message: "Спасибо за отправку!!",
    description: "Thank you message after sharing",
  },
  "userSettings.theme": {
    message: "Тема",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Тёмная",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Светлая",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Системная",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Название должно содержать менее 100 символов",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Название обязательно",
    description: "Validation error for missing title",
  },
  "userSettings.trialProPlan": {
    message: "Перейти на Premium",
    description: "Button text for premium subscription upgrade",
  },
  "userSettings.trialProPlanComingSoon": {
    message: "Функция пробного Pro-тарифа скоро будет доступна!",
    description: "Toast message when trial Pro plan is clicked",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Не удалось открыть портал платежей. Пожалуйста, попробуйте позже.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Неизвестный тарифный план",
    description: "Fallback when plan name is not available",
  },
  "userSettings.updateFailed": {
    message: "Ошибка обновления подписки",
    description: "Error message when update fails",
  },
  "userSettings.updateSuccess": {
    message: "Подписка успешно обновлена",
    description: "Success message after updating subscription",
  },
  "userSettings.upgradeToProDescription": {
    message:
      "Обновитесь до Pro, чтобы разблокировать премиум-функции и неограниченный доступ.",
    description: "Description encouraging subscription upgrade",
  },
  "userSettings.userProfile": {
    message: "Пользователь Profile",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Имя пользователя успешно обновлено",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Еженедельно",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Да, удалить мою учётную запись",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Информация об учётной записи",
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

export default ruUserSettings;
