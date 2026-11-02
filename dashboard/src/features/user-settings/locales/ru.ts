import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ruUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.ru,
  "userSettings.accountDeleted": {
    message: "Учётная запись успешно удалена",
    description: "Success message when account is deleted",
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
  "userSettings.appearance": {
    message: "Внешний вид",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Отменить подписку",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "Отмена...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Это действие нельзя отменить.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Изменить имя",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Изменить имя пользователя",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "Создать ключ",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Создать новый SSH-ключ",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Добавьте новый открытый SSH-ключ для доступа к Git-репозиторию.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Для подтверждения введите ваше имя пользователя "{username}" ниже:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Введите ваше имя пользователя",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Это действие нельзя отменить. Учётная запись будет удалена навсегда, а все ваши данные — с наших серверов.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Удалить учётную запись?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Навсегда удалить учётную запись и все связанные данные. Это действие нельзя отменить.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Удалить ключ",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Удалить SSH-ключ",
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
    message: "Возобновить подписку?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Вы уверены, что хотите возобновить подписку? Она продолжит автоматически продлеваться, и в конце текущего расчётного периода с вас снова будет списана плата.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Да, возобновить подписку",
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
  "userSettings.invite": {
    message: "Пригласить",
    description: "Invite action button",
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
  "userSettings.manageActiveSession": {
    message: "Управление активной сессией",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Управление платежами",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Управление подпиской и оплатой",
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
  "userSettings.opening": {
    message: "Открытие...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Публичный ключ",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "Вставьте сюда публичный ключ. Обычно он начинается с ssh-ed25519 или ssh-rsa; вывести его можно командой cat ~/.ssh/id_ed25519.pub. Публичные ключи PEM тоже принимаются.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Публичный ключ обязателен",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Продлевается",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message:
      "Ваш тарифный план App Store заканчивается {date}. Этот план начнётся тогда же.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "Ваш тарифный план Google Play заканчивается {date}. Этот план начнётся тогда же.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "Ваш тарифный план App Store действует до {date}, а за этот план плата спишется сегодня.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Ваш тарифный план Google Play действует до {date}, а за этот план плата спишется сегодня.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Оплата через Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Оплата через App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Оплата через Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Управляйте подпиской на iPhone или iPad: Настройки → ваше имя → Подписки.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Управлять в Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Заканчивается {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Сменится на {plan} {date}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.signOutDescription": {
    message: "Выйти из учётной записи и очистить сессию.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH-ключи",
    description: "Page title for SSH keys",
  },
  "userSettings.subscriptionStatus.active": {
    message: "Активна",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Пробный период",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Просрочена",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Не оплачена",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Не завершена",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Истекла",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Отменена",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "Приостановлена",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Подписка",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Подписка успешно отменена",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Подписка успешно обновлена",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "Системная",
    description: "System theme option",
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
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Не удалось открыть портал платежей. Пожалуйста, попробуйте позже.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Неизвестный тарифный план",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Профиль пользователя",
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
    message: "Токены ИИ",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "Использовано {used} / {max} токенов в этом месяце",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "Использовано {used} токенов в этом месяце (без ограничений)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "Данные об использовании сейчас недоступны.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Текущий тарифный план",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Бесплатный тарифный план",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Корпоративный",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Использование",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Главные книги",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} главных книг",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Оплата",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Без ограничений",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/мес.",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} токенов AI/месяц",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Неограниченное количество токенов AI",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Неограниченное количество регистров",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} книг",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} книга",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_few": {
    message: "{formattedCount} книги",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 2-4",
  },
  "userSettings.includedLedgers_many": {
    message: "{formattedCount} книг",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 5-20",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} книги",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for fractional counts",
  },
  "userSettings.unlimitedDirectives": {
    message: "Неограниченное количество директив",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} директив",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Неограниченное количество соавторов",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "До {formattedCount} соавторов на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "До {formattedCount} соавтора на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_few": {
    message: "До {formattedCount} соавторов на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 2-4",
  },
  "userSettings.collaboratorsPerLedger_many": {
    message: "До {formattedCount} соавторов на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 5-20",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "До {formattedCount} соавтора на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for fractional counts",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Вы используете {percentage}% своих ежемесячных токенов AI. Обновите, чтобы избежать перебоев.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "отпечаток пальца",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "Ежегодно",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Период оплаты",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Тарифные планы",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Перейти на годовую оплату",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Перейти на ежемесячную оплату",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Понизить тариф",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Связаться с нами",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} при оплате за год",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Экономия {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Платите за год: {yearly} в год вместо {monthlyTotal} — экономия {saving} в год.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/год",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Прежняя цена",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Подтверждаем оплату…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Теперь у вас {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Продление {date} за {amount}. Квитанция придёт на электронную почту.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Теперь доступно: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Оплата получена. Тариф появится в течение минуты; обновите страницу, чтобы проверить.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Обновить",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Вернуться к предыдущей странице",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Начать работу с {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Оплата отменена. Деньги не списаны.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Открыть оплату",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Перейти на {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Рассчитываем стоимость изменения…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "Не удалось рассчитать стоимость изменения. Попробуйте ещё раз.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Начинает действовать сегодня.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "К оплате сегодня",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "Включает кредит {credit} за неиспользованное время текущего тарифа.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Далее {amount}, следующее списание {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Списание с {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Что вы получите",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Оплатить {amount} и перейти",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Перейти к оплате",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Не сейчас",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "Неиспользованное время всегда засчитывается — вы никогда не платите дважды.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "У вас уже этот тариф.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Вы сохраняете этот тариф по прежней, более низкой цене; переход только повысил бы её.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "У вашего аккаунта несколько активных подписок. Обратитесь в поддержку, чтобы сменить тариф.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "Нет активной подписки для изменения. Обновите страницу, чтобы выбрать тариф.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Последний платёж за продление не прошёл. Обновите способ оплаты в разделе «Управление платежами», затем смените тариф.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Начнётся {date}. До тех пор у вас остаётся {plan}.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Сегодня платить ничего не нужно.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Что изменится {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Соавторы на книгу",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "Токены ИИ в месяц",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "у вас {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Все ваши книги остаются вашими и продолжают работать. Создать новую можно будет, только когда их станет меньше нового лимита в {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Запланировать понижение",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Запланировать переход",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Оставить {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Запланировано на {date}. До тех пор ничего не меняется.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Это заменит ваш запланированный переход на {plan} {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "Это также отзывает отмену подписки: подписка продолжится.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Ваша текущая цена больше не предлагается, поэтому она закончится с этим изменением.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} с ежемесячной оплатой может начаться при продлении {date}. Хотите {plan} уже сегодня?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "Получить {plan} сегодня с годовой оплатой — {amount} сейчас",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Перейти на {plan} помесячно {date} — сегодня ничего",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Вступит в силу при продлении",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Больше не входит",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Директивы",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Запланировано",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "{date} тариф сменится на {plan}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} закончится {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Оставить текущий",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Ваш тариф остаётся прежним.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message:
      "Не удалось отменить запланированное изменение. Попробуйте ещё раз.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "Отменить {plan}?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "{plan} остаётся у вас до {date}. Затем вы перейдёте на бесплатный тариф: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Ваши книги — обычный текст: экспортируйте их когда угодно. Ничего не удаляется.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Другие варианты",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Перейти на годовую оплату — {price}/месяц",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Понизить до {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Какова основная причина? (необязательно)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Слишком дорого",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Не хватает функции",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Не пользуюсь",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Перехожу на другой инструмент",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Другое",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Ваш банк должен подтвердить этот платёж. До этого ничего не изменится; после подтверждения обновите страницу.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Ждём, пока банк подтвердит платёж…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Подтвердить платёж",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "Банк не подтвердил платёж. Ничего не изменилось.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Использовать другую карту",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Автоматическое резервное копирование",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Расширенная автоматизация и интеграции",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Единый вход (SSO) через OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Консолидация нескольких юрлиц",
    description: "Plan feature from the pricing table",
  },
};

export default ruUserSettings;
