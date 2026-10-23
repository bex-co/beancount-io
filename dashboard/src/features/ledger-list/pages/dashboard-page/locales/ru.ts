export interface TranslationEntry {
  message: string;
  description: string;
}

const ruDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Создать книгу",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Создать новую книгу",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message: "Создайте новую книгу Beancount для управления вашими финансами.",
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
    message: "Удалить книгу",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Вы уверены, что хотите удалить "{name}"? Это действие не может быть отменено.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Удаление...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Описание (необязательно)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Редактировать книгу",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Редактировать настройки книги",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Введите описание",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Введите название книги",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Не удалось загрузить книги",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Не удалось загрузить ленту",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Книга успешно создана",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Книга успешно удалена",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Вы достигли лимита главных книг. Обновите подписку, чтобы создать больше книг.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Название книги",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Настройки для {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Книга успешно обновлена",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Загрузка книг...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Управление вашими книгами Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Используйте хотя бы одну латинскую букву (A–Z) или цифру: название становится веб-адресом книги.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Имя должно быть меньше 100 символов",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Имя обязательно",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Личная книга",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "Запишите покупку и поймите её влияние на остаток денег.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Книга фрилансера",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Запишите доход от клиентов или посмотрите, сколько должен неоплативший клиент.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Книга бизнеса",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Создайте начальную позицию и отличайте финансирование от выручки.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Портфельная книга",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Запишите покупку и проверьте единицы, записи о приобретении и движение денег.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Книга аренды",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "Запишите поступления и отличайте аренду от возвратного залога.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Книга общих расходов",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Запишите аванс и посмотрите, кто кому должен.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Книга сообщества",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Объясните взносы, проектные расходы и оставшиеся средства.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Пустая книга",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message: "Добавьте выбранную структуру, не удаляя ненужные категории.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Введите сумму, например 100 или -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Операционная валюта",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Книги начинаются с",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Счёт открытия",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Начальный остаток (необязательно)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Решить позже",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Проверка",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "Будет создано именно это. Вернитесь, чтобы что-то изменить.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Счета",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Шаг {step} из {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Книги не найдены",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "Создайте свою первую книгу, чтобы начать отслеживать свои финансы.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Приватная",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Доступ только для вас и соавторов",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Публичная",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message:
      "Любой пользователь со ссылкой может просматривать ваши финансовые данные",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Имя репозитория",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Повторить",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Поиск книг...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Выберите книгу",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — сменить книгу",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Показать Больше",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Обновите детали вашей книги.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Ваши книги",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Перейти к профилю {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Активность",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Изменения в ваших книгах появятся здесь.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Изменения во всех доступных вам книгах",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message: "Не удалось обновить активность. Показана загруженная ранее.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default ruDashboardPage;
