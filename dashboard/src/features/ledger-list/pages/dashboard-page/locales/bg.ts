export interface TranslationEntry {
  message: string;
  description: string;
}

const bgDashboardPage: Record<string, TranslationEntry> = {
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
  "page.dashboard.goToDashboard": {
    message: "Към таблото",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
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
  "page.dashboard.ledgerSettingsFor": {
    message: "Настройки за {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
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
  "page.dashboard.nameInvalid": {
    message:
      "Използвайте поне една латинска буква (A–Z) или цифра: името става уеб адрес на книгата.",
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
  "page.dashboard.presetPersonal": {
    message: "Лична книга",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "Запишете покупка и разберете ефекта ѝ върху оставащите пари.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Книга на свободна практика",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Запишете приходи от клиенти или вижте какво дължи неплатил клиент.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Фирмена книга",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message: "Създайте начална позиция и разграничете финансиране от приходи.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Портфейлна книга",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Запишете покупка и проверете единици, записи за придобиване и движение на пари.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Книга за наеми",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "Запишете постъпления и разграничете наем от възвръщаем депозит.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Книга за споделени разходи",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Запишете аванс и вижте кой на кого дължи.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Книга на общност",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Обяснете вноски, проектни разходи и оставащи средства.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Празна книга",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Добавете избрана структура, без да премахвате нежелани категории.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Въведете сума като 100 или -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Оперативна валута",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Книгите започват на",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Начална сметка",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Начално салдо (по избор)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Реши по-късно",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Преглед",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "Точно това ще бъде създадено. Върнете се, за да промените нещо.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Сметки",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Стъпка {step} от {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Няма намерени книги",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "Създайте първата си книга, за да започнете да следите финансите си.",
    description:
      "Empty state description prompting the user to create their first ledger",
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
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — смяна на книга",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
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
  "page.dashboard.activity": {
    message: "Активност",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Промените в твоите счетоводни книги се показват тук.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Промени във всички счетоводни книги, до които имаш достъп",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message: "Активността не можа да се обнови. Показва се заредената по-рано.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default bgDashboardPage;
