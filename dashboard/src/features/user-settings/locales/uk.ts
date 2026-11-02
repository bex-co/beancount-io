import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ukUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.uk,
  "userSettings.accountDeleted": {
    message: "Обліковий запис успішно видалено",
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
    message: "Зміна імені користувача",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "Створити ключ",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Створити новий SSH-ключ",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Додайте новий відкритий SSH-ключ для доступу до Git-репозиторію.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
    message: "Налаштуйте вигляд і поведінку застосунку",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Небезпечна зона",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Темна",
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
    message: "Видалити обліковий запис?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Назавжди видалити ваш обліковий запис і всі пов'язані дані. Цю дію неможливо скасувати.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Видалити ключ",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Видалити SSH ключ",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Ви впевнені, що хочете видалити ключ",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Видалення...",
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
    message: "Помилка завантаження налаштувань",
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
    message: "Востаннє використано за останні 3 місяці",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Востаннє використано за останні 3 тижні",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Востаннє використано понад 3 місяці тому",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Востаннє використано за останній тиждень",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Світла",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Завантаження інформації вашого облікового запису...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Завантаження інформації про сеанс...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Завантаження ваших SSH ключів...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Завантаження деталей підписки...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Завантаження налаштувань теми...",
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
    message: "Відкритий ключ",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "Вставте сюди публічний ключ. Зазвичай він починається з ssh-ed25519 або ssh-rsa; вивести його можна командою cat ~/.ssh/id_ed25519.pub. Публічні ключі PEM також приймаються.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Відкритий ключ обов'язковий",
    description: "Validation error for missing public key",
  },
  "userSettings.startsOn": {
    message: "Почнеться",
    description: "Label for when a deferred Stripe plan starts",
  },
  "userSettings.renewsOn": {
    message: "Поновлюється",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message:
      "Ваш план App Store закінчується {date}. Цей план почнеться тоді ж.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "Ваш план Google Play закінчується {date}. Цей план почнеться тоді ж.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "Ваш план App Store діє до {date}, а за цей план кошти спишуться сьогодні.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Ваш план Google Play діє до {date}, а за цей план кошти спишуться сьогодні.",
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
      "Керуйте підпискою на iPhone або iPad: Параметри → ваше ім’я → Підписки.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Керувати в Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Закінчується {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Зміниться на {plan} {date}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.subscriptionStatus.active": {
    message: "Активна",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Почнеться пізніше",
    description:
      "Billing badge for a Stripe subscription waiting for a store plan to end before its first charge (ADR 001 D15). No plan is sold with a trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Прострочена",
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
    message: "Минула",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Скасована",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "Призупинена",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Підписка",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Підписку успішно скасовано",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Підписку успішно оновлено",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "Системна",
    description: "System theme option",
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
    message: "Профіль користувача",
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
    message: "Токени ШІ",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "Використано {used} / {max} токенів цього місяця",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "Використано {used} токенів цього місяця (необмежено)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "Дані про використання зараз недоступні.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Поточний план",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Безкоштовний план",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Корпоративний",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Використання",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Книги",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} книг",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Оплата",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Необмежено",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/міс.",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} токенів AI / місяць",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Необмежена кількість токенів AI",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Необмежена кількість книг",
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
    message: "До {formattedCount} співавторів на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "До {formattedCount} співавтора на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_few": {
    message: "До {formattedCount} співавторів на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 2-4",
  },
  "userSettings.collaboratorsPerLedger_many": {
    message: "До {formattedCount} співавторів на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 5-20",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "До {formattedCount} співавтора на книгу",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for fractional counts",
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
  "userSettings.yearly": {
    message: "Щороку",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Період оплати",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Тарифні плани",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Перейти на річну оплату",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Перейти на щомісячну оплату",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Знизити тариф",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Зв'язатися з нами",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} при оплаті за рік",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Заощадьте {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Платіть за рік: {yearly} на рік замість {monthlyTotal} — заощаджуєте {saving} щороку.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/рік",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Попередня ціна",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Підтверджуємо оплату…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Тепер у вас {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Поновлюється {date} за {amount}. Квитанція надійде на електронну пошту.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Тепер доступно: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Оплату отримано. Тариф з'явиться протягом хвилини; оновіть сторінку, щоб перевірити.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Оновити",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Повернутися на попередню сторінку",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Почати користуватися {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Оплату скасовано. Кошти не списано.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Відкрити оплату",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Перейти на {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Розраховуємо вартість зміни…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "Не вдалося розрахувати вартість зміни. Спробуйте ще раз.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Діє з сьогодні.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "До сплати сьогодні",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message: "Включає кредит {credit} за невикористаний час поточного тарифу.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Далі {amount}, наступне списання {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Списання з {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Що ви отримаєте",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Сплатити {amount} і перейти",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Перейти до оплати",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Не зараз",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "Невикористаний час завжди зараховується — ви ніколи не платите двічі.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "У вас уже цей тариф.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Ви зберігаєте цей тариф за попередньою, нижчою ціною; перехід лише підвищив би її.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Ваш обліковий запис має кілька активних підписок. Зверніться до підтримки, щоб змінити тариф.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "Немає активної підписки для зміни. Оновіть сторінку, щоб вибрати тариф.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Останній платіж за продовження не пройшов. Оновіть спосіб оплати в розділі «Керувати платежами», а потім змініть тариф.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Почнеться {date}. До того у вас залишається {plan}.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Сьогодні нічого не треба платити.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Що зміниться {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Співавтори на книгу",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "Токени ШІ на місяць",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "у вас {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Усі ваші книги залишаються вашими й працюють далі. Створити нову можна буде лише тоді, коли їх стане менше за новий ліміт у {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Запланувати зниження",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Запланувати перехід",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Залишити {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Заплановано на {date}. До того нічого не змінюється.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Це замінить ваш запланований перехід на {plan} {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "Це також відкликає скасування: підписка триває.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Ваша поточна ціна більше не пропонується, тож вона завершиться з цією зміною.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} із щомісячною оплатою може початися під час продовження {date}. Хочете {plan} уже сьогодні?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "Отримати {plan} сьогодні з річною оплатою — {amount} зараз",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Перейти на {plan} щомісяця {date} — сьогодні нічого",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Набуде чинності під час продовження",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Більше не входить",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Директиви",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Заплановано",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "{date} тариф зміниться на {plan}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} завершиться {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Залишити поточний",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Ваш тариф залишається без змін.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "Не вдалося скасувати заплановану зміну. Спробуйте ще раз.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "Скасувати {plan}?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "{plan} залишається у вас до {date}. Потім ви перейдете на безкоштовний план: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Ваші книги — звичайний текст: експортуйте їх будь-коли. Нічого не видаляється.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Інші варіанти",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Перейти на річну оплату — {price}/місяць",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Знизити до {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Яка головна причина? (необов'язково)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Задорого",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Бракує функції",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Не користуюся",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Переходжу на інший інструмент",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Інше",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Ваш банк має підтвердити цей платіж. До того нічого не зміниться; після підтвердження оновіть сторінку.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Чекаємо, поки банк підтвердить платіж…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Підтвердити платіж",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "Банк не підтвердив платіж. Нічого не змінилося.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Використати іншу картку",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Автоматичне резервне копіювання",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Розширена автоматизація та інтеграції",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Єдиний вхід (SSO) через OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Консолідація кількох юросіб",
    description: "Plan feature from the pricing table",
  },
};

export default ukUserSettings;
