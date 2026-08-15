export interface TranslationEntry {
  message: string;
  description: string;
}

const bgUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accessUntil": {
    message: "Достъп до",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Акаунтът е изтрит успешно",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "Добавяне на нов ключ",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Добавен",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Всички качени документи и прикачени файлове",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Всички ваши книги и история на транзакции",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Всички предпочитания и настройки",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Всички транзакции и записи",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "Външен вид",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Отказ на абонамент",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Сигурни ли сте, че искате да откажете абонамента си? Ще продължите да имате достъп до края на текущия си платежен период.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Отказ на абонамент?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Отказване...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Това действие не може да бъде отменено.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Промяна на име",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Промяна на потребителското име",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Да, откажи абонамента",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Създаване на ключ",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Създаване на нов API ключ",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Добавете нов публичен ключ за удостоверяване с Beancount API.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Създаване на нов ключ",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Създаване...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Език",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "Персонализиране на външния вид и поведението на приложението",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Опасна зона",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Тъмна",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Изтриване на акаунт",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'За потвърждение, въведете вашето потребителско име "{username}" по-долу:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Въведете вашето потребителско име",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Това действие не може да бъде отменено. Това ще изтрие окончателно вашия акаунт и ще премахне всички ваши данни от нашите сървъри.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Изтриване на акаунт?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Окончателно изтриване на вашия акаунт и всички свързани данни. Това действие не може да бъде отменено.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Изтриване на ключ",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Изтриване на SSH ключ",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Сигурни ли сте, че искате да изтриете ключа",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Изтриване...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Въведете вашето име по-долу",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Въведете новото си потребителско име по-долу",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Въведете ново потребителско име",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Грешка при създаване на ключ",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Грешка при зареждане на настройки",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Неуспешно отказване на абонамент",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Възобновяване на абонамент",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "Възобновяване на абонамента?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Сигурни ли сте, че искате да възобновите абонамента си? Абонаментът ви ще продължи да се подновява автоматично и ще бъдете таксувани отново в края на текущия период на фактуриране.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Да, възобновяване на абонамента",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Възобновяване...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Абонаментът е възобновен успешно",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Неуспешно възобновяване на абонамент",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Неуспешно създаване на сесия за плащане. Моля, опитайте отново.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Неуспешно зареждане на ключове",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Възникна грешка при зареждането на вашите SSH ключове. Моля, опитайте отново.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Неуспешно зареждане на настройки",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Неуспешно зареждане на състоянието на абонамента",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Име",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Следното ще бъде окончателно изтрито:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Общи",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "Покани",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "Необратими и разрушителни действия",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Заглавие на ключа",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Описателно име за този ключ, което да ви помогне да го идентифицирате по-късно.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "напр., Моят развоен ключ",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Фамилия",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Последно използван през последните 3 месеца",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Последно използван през последните 3 седмици",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Последно използван преди повече от 3 месеца",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Последно използван през последната седмица",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Светла",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Зареждане на информацията за вашия акаунт...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Зареждане на информацията за сесията...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Зареждане на вашите SSH ключове...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Зареждане на детайлите за абонамента...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Зареждане на предпочитанията за тема...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "Управление на вашата активна сесия",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Управление на плащания",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Управление на вашия абонамент и плащания",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Месечно",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Име",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Никога не е използван",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Нов SSH ключ",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "Няма SSH ключове",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Все още не сте създали SSH ключове. Създайте първия си ключ, за да започнете с сигурен достъп до хранилището.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Не е зададено",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "Отваряне...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Публичен ключ",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Поставете съдържанието на вашия публичен ключ тук. Трябва да започва с "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Публичният ключ е задължителен",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Подновява се на",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "Изберете предпочитаната от вас цветна тема",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Изберете предпочитания от вас език",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Сесия",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "Излезте от акаунта си и изчистете сесията си.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH ключове",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "Абонамент",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Абонаментът е отказан",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Абонаментът е отказан успешно",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Абонаментът е обновен успешно",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Плащането ви изисква допълнително удостоверяване. Моля, проверете имейла си или издателя на картата.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "Системна",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Тестов режим",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "Тема",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Тъмна",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Светла",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Системна",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Заглавието трябва да бъде по-малко от 100 символа",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Заглавието е задължително",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Невъзможно е да се отвори порталът за плащания. Моля, опитайте отново по-късно.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Неизвестен план",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Потребителски профил",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Потребителското име е актуализирано успешно",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Седмично",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Да, изтрий моя акаунт",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Информацията за вашия акаунт",
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
};

export default bgUserSettings;
