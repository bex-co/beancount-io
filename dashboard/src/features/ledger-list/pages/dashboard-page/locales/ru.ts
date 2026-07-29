export interface TranslationEntry {
  message: string;
  description: string;
}

const ruDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Последние Обновления",
    description: "Title for blog feed section on dashboard",
  },
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
  "page.dashboard.failedToCreateLedger": {
    message: "Не удалось создать книгу",
    description: "Error message when ledger creation fails",
  },
  "page.dashboard.failedToDeleteLedger": {
    message: "Не удалось удалить книгу",
    description: "Error message when ledger deletion fails",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Не удалось загрузить книги",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "Не удалось получить ваши книги. Проверьте соединение и попробуйте снова.",
    description: "Detailed error description for ledger loading failure",
  },
  "page.dashboard.failedToUpdateLedger": {
    message: "Не удалось обновить книгу",
    description: "Error message when ledger update fails",
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
  "page.dashboard.manageLedgersDescription": {
    message:
      "Управляйте вашими книгами Beancount. Нажмите на книгу для просмотра её деталей.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "Имя должно содержать хотя бы одну букву или цифру",
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
  "page.dashboard.noFeedItems": {
    message: "Нет доступных элементов ленты",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "Книги не найдены",
    description: "Message when user has no ledgers",
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
    description: "Aria label for ledger switcher button",
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
};

export default ruDashboardPage;
