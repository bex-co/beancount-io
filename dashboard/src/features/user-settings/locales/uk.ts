import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ukUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.uk,
  "userSettings.accessUntil": {
    message: "Доступ до",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Рахунок deleted successfully",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "Додати новий ключ",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Додано",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Всі завантажені документи та вкладення",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Всі ваші книги та історія транзакцій",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Всі налаштування та параметри",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Всі транзакції та записи",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "Зовнішній вигляд",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Скасувати підписку",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Ви впевнені, що хочете скасувати підписку? У вас залишиться доступ до кінця поточного платіжного періоду.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Скасувати підписку?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Скасування...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Цю дію неможливо скасувати.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Змінити ім'я",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Зміна Username",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Так, скасувати підписку",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Створити ключ",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Створити новий API ключ",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Додайте новий публічний ключ для автентифікації в Beancount API.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Створити новий ключ",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Створення...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Мова",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "Власнийize how the application looks and feels",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Вanger Zone",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Вark",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Видалити обліковий запис",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Для підтвердження введіть ваше ім\'я користувача "{username}" нижче:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Введіть ваше ім'я користувача",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Цю дію неможливо скасувати. Це назавжди видалить ваш обліковий запис і видалить всі ваші дані з наших серверів.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Видалити Account?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Назавжди видалити ваш обліковий запис і всі пов'язані дані. Цю дію неможливо скасувати.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Видалити Key",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Видалити SSH Key",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Ви впевнені, що хочете видалити ключ",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Вeleting...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Введіть ваше ім'я нижче",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Введіть нове ім'я користувача нижче",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Введіть нове ім'я користувача",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Помилка створення ключа",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Помилка loading settings",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Не вдалося скасувати підписку",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Відновити підписку",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "Відновити підписку?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Ви впевнені, що хочете відновити підписку? Вона й надалі автоматично поновлюватиметься, а наприкінці поточного розрахункового періоду з вас знову буде стягнуто плату.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Так, відновити підписку",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Відновлення...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Підписку успішно відновлено",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Не вдалося відновити підписку",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Не вдалося створити сеанс оплати. Будь ласка, спробуйте ще раз.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Не вдалося завантажити ключі",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Сталася помилка під час завантаження ваших SSH ключів. Спробуйте ще раз.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Не вдалося завантажити налаштування",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Не вдалося завантажити статус підписки",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Ім'я",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Наступне буде назавжди видалено:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Загальні",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "Запросити",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "Незворотні та руйнівні дії",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Назва ключа",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Описова назва цього ключа, щоб допомогти вам ідентифікувати його пізніше.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "напр., Мій ключ розробки",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Прізвище",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Пast used within the last 3 months",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Пast used within the last 3 weeks",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Пast used more than 3 months ago",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Пast used within the last week",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Пight",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Пoading your account information...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Пoading session information...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Пoading your SSH keys...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Пoading subscription details...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Пoading theme preferences...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "Керуйте своїм активним сеансом",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Керувати платежами",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Керуйте своєю підпискою та оплатою",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Щомісяця",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Ім'я",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Ніколи не використовувався",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Новий SSH ключ",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "Немає SSH ключів",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Ви ще не створили жодного SSH ключа. Створіть свій перший ключ, щоб розпочати безпечний доступ до репозиторію.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Не встановлено",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "Відкриття...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Публічний Key",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Вставте вміст вашого публічного ключа тут. Він має починатися з "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Публічний key is required",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Поновлюється",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "Виберіть бажану колірну тему",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Виберіть бажану мову",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Сеанс",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "Вийдіть зі свого облікового запису та очистіть свій сеанс.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH Ключі",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "Підписка",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Підписку скасовано",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Підписку успішно скасовано",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Підписку успішно оновлено",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Ваш платіж потребує додаткової автентифікації. Будь ласка, перевірте електронну пошту або зверніться до емітента картки.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "Системна",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Тестовий режим",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "Тема",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Темна",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Світла",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Системна",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Назва має бути менше 100 символів",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Назва обов'язкова",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Не вдалося відкрити портал платежів. Будь ласка, спробуйте пізніше.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Невідомий план",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Користувач Profile",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Ім'я користувача успішно оновлено",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Щотижня",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Так, видалити мій обліковий запис",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Інформація вашого облікового запису",
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
    message: "{count} токенів AI / місяць",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedLedgers": {
    message: "Необмежена кількість книг",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{count} книга(и)",
    description: "Ledger allowance for a subscription tier",
  },
  "userSettings.unlimitedDirectives": {
    message: "Необмежені директиви",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} директив",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Необмежена кількість співавторів",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "До {count} співавторів на одну книгу",
    description: "Collaborator allowance for each ledger",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Ви використовуєте {percentage}% своїх щомісячних токенів ШІ. Оновіть, щоб уникнути перебоїв.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "відбиток пальця",
    description: "Label for an SSH key fingerprint",
  },
};

export default ukUserSettings;
