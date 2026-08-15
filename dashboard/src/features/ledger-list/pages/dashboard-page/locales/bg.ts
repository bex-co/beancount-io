export interface TranslationEntry {
  message: string;
  description: string;
}

const bgDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Последни Новини",
    description: "Title for blog feed section on dashboard",
  },
  "page.dashboard.createLedger": {
    message: "Създаване на книга",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Създаване на нова книга",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Създайте нова книга на Beancount, за да започнете управлението на финансите си.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Табло",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.deleteLedger": {
    message: "Изтриване на книга",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Сигурни ли сте, че искате да изтриете "{name}"? Това действие не може да бъде отменено.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Изтриване...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Описание (по избор)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Редактиране на книга",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Редактиране на настройките на книгата",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Въведете описание",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Въведете име на книгата",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Неуспешно зареждане на книгите",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "Не можахме да извлечем вашите книги. Моля, проверете връзката си и опитайте отново.",
    description: "Detailed error description for ledger loading failure",
  },
  "page.dashboard.feedError": {
    message: "Грешка при зареждане на емисията",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Книгата е създадена успешно",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Книгата е изтрита успешно",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Достигнахте лимита си за книги. Надстройте, за да създадете повече книги.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Име на книгата",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Книгата е актуализирана успешно",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Зареждане на книги...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Управление на вашите книги на Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.manageLedgersDescription": {
    message:
      "Управление на вашите книги на Beancount. Кликнете върху книга, за да видите подробностите ѝ.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "Името трябва да съдържа поне една буква или число",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Името трябва да бъде по-малко от 100 символа",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Името е задължително",
    description: "Validation error when name is missing",
  },
  "page.dashboard.noFeedItems": {
    message: "Няма налични елементи",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "Няма намерени книги",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.private": {
    message: "Частна",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Само вие и сътрудниците имате достъп",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Публична",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Всеки с връзката може да вижда вашите финансови данни",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Име на хранилището",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Повторен опит",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Търсене на книги...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Изберете книга",
    description: "Aria label for ledger switcher button",
  },
  "page.dashboard.showMore": {
    message: "Покажи Повече",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Актуализирайте подробностите на вашата книга.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Вашите книги",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Отиди на профила на {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
};

export default bgDashboardPage;
