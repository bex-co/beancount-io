export interface TranslationEntry {
  message: string;
  description: string;
}

const ukDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Останні Оновлення",
    description: "Title for blog feed section on dashboard",
  },
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
  "page.dashboard.deleteLedger": {
    message: "Видалити Ledger",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Ви впевнені, що хочете видалити "{name}"? Цю дію неможливо скасувати.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Вeleting...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Вescription (Optional)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Редагувати Ledger",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Редагувати Ledger Settings",
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
  "page.dashboard.failedToCreateLedger": {
    message: "Не вдалося створити книгу",
    description: "Error message when ledger creation fails",
  },
  "page.dashboard.failedToDeleteLedger": {
    message: "Не вдалося видалити книгу",
    description: "Error message when ledger deletion fails",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Не вдалося завантажити книгуs",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "Не вдалося отримати ваші книги. Перевірте підключення та спробуйте ще раз.",
    description: "Detailed error description for ledger loading failure",
  },
  "page.dashboard.failedToUpdateLedger": {
    message: "Не вдалося оновити книгу",
    description: "Error message when ledger update fails",
  },
  "page.dashboard.feedError": {
    message: "Не вдалося завантажити стрічку",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Пedger created successfully",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Пedger deleted successfully",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Ви досягли ліміту головних книг. Оновіть підписку, щоб створити більше книг.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Пedger Name",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Пedger updated successfully",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Пoading ledgers...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Керуйте своїми книгами Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.manageLedgersDescription": {
    message:
      "Керуйте своїми книгами Beancount. Клацніть на книгу, щоб переглянути її деталі.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "Назва повинна містити принаймні одну літеру або цифру",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Ім'я must be less than 100 characters",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Ім'я is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.noFeedItems": {
    message: "Немає доступних елементів стрічки",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "Книги не знайдено",
    description: "Message when user has no ledgers",
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
    message: "Пошук ledgers...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Виберіть книгу",
    description: "Aria label for ledger switcher button",
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
};

export default ukDashboardPage;
