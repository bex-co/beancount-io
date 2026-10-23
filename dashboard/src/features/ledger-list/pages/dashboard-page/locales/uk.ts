export interface TranslationEntry {
  message: string;
  description: string;
}

const ukDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Створити книгу",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Створити нову книгу",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Створіть нову книгу Beancount, щоб почати керувати своїми фінансами.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Панель",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Перейти на панель",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Видалити книгу",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Ви впевнені, що хочете видалити "{name}"? Цю дію неможливо скасувати.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Видалення...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Опис (необов'язково)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Редагувати книгу",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Редагувати налаштування книги",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Введіть опис",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Введіть назву книги",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Не вдалося завантажити книги",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Не вдалося завантажити стрічку",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Книгу успішно створено",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Книгу успішно видалено",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Ви досягли ліміту головних книг. Оновіть підписку, щоб створити більше книг.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Назва книги",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Налаштування для {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Книгу успішно оновлено",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Завантаження книг...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Керуйте своїми книгами Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Використайте принаймні одну латинську літеру (A–Z) або цифру: назва стає веб-адресою книги.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Назва має містити менше 100 символів",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Назва обов'язкова",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Особиста книга",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "Запишіть покупку та зрозумійте її вплив на залишок грошей.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Книга фрилансера",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Запишіть дохід від клієнтів або подивіться, скільки винен неоплачений клієнт.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Книга бізнесу",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Створіть початкову позицію та відрізняйте фінансування від виручки.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Портфельна книга",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Запишіть покупку та перевірте одиниці, записи про придбання і рух грошей.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Книга оренди",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message:
      "Запишіть надходження та відрізняйте оренду від поверненої застави.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Книга спільних витрат",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Запишіть аванс і подивіться, хто кому винен.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Книга спільноти",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Поясніть внески, проектні витрати та залишки коштів.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Порожня книга",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message: "Додайте обрану структуру, не видаляючи непотрібні категорії.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Введіть суму, наприклад 100 або -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Операційна валюта",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Книги починаються з",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Рахунок відкриття",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Початковий залишок (необов’язково)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Вирішити пізніше",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Перевірка",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "Буде створено саме це. Поверніться, щоб щось змінити.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Рахунки",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Крок {step} з {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Книги не знайдено",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message: "Створіть свою першу книгу, щоб почати відстежувати свої фінанси.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Приватний",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Лише ви та співробітники можете отримати доступ",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Публічний",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Будь-хто з посиланням може переглядати ваші фінансові дані",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Назва репозиторію",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Спробувати ще раз",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Пошук книг...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Виберіть книгу",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — змінити книгу",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Показати Більше",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Оновіть деталі вашої книги.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Ваші книги",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Перейти до профілю {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Активність",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Зміни у ваших книгах з’являться тут.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Зміни в усіх доступних вам книгах",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message: "Не вдалося оновити активність. Показано завантажену раніше.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default ukDashboardPage;
