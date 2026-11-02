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
  "page.dashboard.currencyFromSaved": {
    message: "От запазеното ви предпочитание",
    description:
      "Source label under the suggested currency: the account's saved preference (ADR026)",
  },
  "page.dashboard.currencyFromRegion": {
    message: "От региона на браузъра ви",
    description:
      "Source label under the suggested currency: the browser region (ADR026)",
  },
  "page.dashboard.currencyUseTimeZone": {
    message: "Използвайте {currency} (от часовата ви зона)",
    description:
      "One-tap button offering the browser time zone's currency when it differs from the suggestion (ADR026)",
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
  "page.dashboard.setupAccounts": {
    message: "Сметки",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupPurposeNote": {
    message:
      "Фирма, клуб или пари, споделени с други хора, имат свой отделен регистър.",
    description:
      "Note beside the purpose choice in ledger creation: other entities get their own ledger",
  },
  "page.dashboard.setupModules": {
    message: "Проследявайте също в този регистър",
    description:
      "Heading of the personal-only module list in ledger creation (PRFAQ001 A.9)",
  },
  "page.dashboard.moduleInvestments": {
    message: "Инвестиции",
    description: "Name of the investments module",
  },
  "page.dashboard.moduleInvestmentsOutcome": {
    message: "Брокерски активи, дивиденти, лихви и печалби.",
    description: "One-line outcome of the investments module",
  },
  "page.dashboard.moduleRentalProperty": {
    message: "Имот под наем",
    description: "Name of the rental-property module",
  },
  "page.dashboard.moduleRentalPropertyOutcome": {
    message: "Наем, депозити и разходи за един имот.",
    description: "One-line outcome of the rental-property module",
  },
  "page.dashboard.moduleSideBusiness": {
    message: "Странична дейност",
    description: "Name of the side-business module",
  },
  "page.dashboard.moduleSideBusinessOutcome": {
    message:
      "Приходи от клиенти и бизнес разходи с отделна бизнес банкова сметка.",
    description: "One-line outcome of the side-business module",
  },
  "page.dashboard.setupPropertyName": {
    message: "Име на имота",
    description: "Label for the rental property's account name",
  },
  "page.dashboard.setupPropertyNameHint": {
    message: "Използва се в имената на сметките, например {example}.",
    description:
      "Hint under the rental property name field - interpolation: {example} (an example account name)",
  },
  "page.dashboard.setupPropertyNameInvalid": {
    message:
      "Започнете с главна латинска буква или цифра, след това използвайте само букви, цифри и тирета (до 64).",
    description: "Validation message for an invalid rental property name",
  },
  "page.dashboard.setupBalanceAsOf": {
    message: "Салдо към",
    description:
      "Label for the date of a known opening balance, which starts the books",
  },
  "page.dashboard.setupSummaryAccounts": {
    message: "{count} сметки",
    description:
      "Account count in the summary beside Create ledger - interpolation: {count} (base key for pluralization)",
  },
  "page.dashboard.setupSummaryAccounts_one": {
    message: "{count} сметка",
    description:
      "Account count in the summary beside Create ledger - interpolation: {count} - one form",
  },
  "page.dashboard.setupSummaryAccounts_other": {
    message: "{count} сметки",
    description:
      "Account count in the summary beside Create ledger - interpolation: {count} - other form",
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
