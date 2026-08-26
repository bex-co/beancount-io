export interface TranslationEntry {
  message: string;
  description: string;
}

const ukCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Рахунок",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Транзакції",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Назад",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Логотип Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Скасувати",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Очистити",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Закрити",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Ліміт співробітників",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Ліміт співробітників досягнуто",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Скопійовано",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Копіювати",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Видалити",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.edit": {
    message: "Редагувати",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Ми зіткнулися з несподіваною помилкою. Будь ласка, спробуйте ще раз або поверніться на попередню сторінку.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Деталі помилки",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Сталася помилка",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Щось пішло не так",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Не вдалося завантажити дані",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Не вдалося завантажити книгу",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Повернутися",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "На головну",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Перейти на наступну сторінку",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Перейти на попередню сторінку",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Імпорт",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Додати запис",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Транзакція, баланс або нотатка",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Розумний імпорт",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Банківські виписки, CSV, PDF або скани",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Підключити банк",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Автоматично синхронізувати транзакції",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Завантажити чек",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Сканувати чек за допомогою ШІ",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Недійсні параметри URL",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Надані параметри URL недійсні. Будь ласка, перевірте посилання та спробуйте ще раз.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Останнє оновлення",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Налаштування книги",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Ліміт книг",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Ліміт книг досягнуто",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "завантаження...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Завантаження даних...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Більше сторінок",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Ім'я",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "близько до ліміту",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Збій мережевого з'єднання",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Не вдалося підключитися до сервера. Перевірте інтернет-з'єднання та спробуйте ще раз.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Далі",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Далі",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Дані не знайдено.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Результатів не знайдено.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Інше",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Власник",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Сторінку не знайдено",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "Сторінка, яку ви шукаєте, не існує або була переміщена в інше місце.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "пагінація",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Попередня",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Пов'язані сторінки",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Зберегти",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Збереження...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Пов'язані сторінки",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Виберіть вигляд",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Виберіть дату",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Налаштування",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Бічна панель",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Відображає мобільну бічну панель.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Зірки",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Статус",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Перемкнути бічну панель",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Спробувати ще раз",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "Сталася несподівана помилка під час завантаження книги.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Невідомо",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "оновлення...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Перейти на Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Оновіть, щоб розблокувати",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "користувач@приклад.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Користувач",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Завантажити",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Більше дій",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Дізнатися більше",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Перегляд детальної інформації про рахунок для {ledgerName}. Аналізуйте транзакції, баланси та історію рахунку.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Задавайте питання про фінансові дані {ledgerName} за допомогою ШІ. Аналізуйте транзакції, досліджуйте залишки на рахунках, розумійте тенденції та отримуйте миттєві бухгалтерські інсайти.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Перегляд балансу для {ledgerName}. Аналізуйте активи, зобов'язання та власний капітал у будь-який момент часу.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.cashFlow": {
    message:
      "Переглядайте звіт про рух грошових коштів для {ledgerName}. Відстежуйте операційні, інвестиційні та фінансові грошові потоки з часом.",
    description: "Description for cash flow page",
  },
  "common.pageDescription.commodities": {
    message:
      "Переглядайте та керуйте товарами (валютами, акціями та активами), що використовуються в {ledgerName}. Відстежуйте обмінні курси та історію цін.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Створіть новий файл у {ledgerName}. Додайте файли книги Beancount або документи до свого репозиторію.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Переглядайте документи, прикріплені до транзакцій у {ledgerName}. Переглядайте квитанції, рахунки та підтверджуючу документацію.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Перегляд помилок парсингу та валідації в {ledgerName}. Виправте проблеми, щоб забезпечити точні фінансові звіти.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Переглядайте важливі події та віхи в {ledgerName}. Відстежуйте відкриття, закриття рахунків та події життєвого циклу.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Переглядайте та редагуйте вихідні файли Beancount у {ledgerName}. Керуйте планом рахунків та історією транзакцій.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Аналізуйте свої поточні володіння та портфель у {ledgerName}. Переглядайте розподіл активів, ринкові вартості та нереалізований прибуток.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Додайте транзакції до {ledgerName} з банківських виписок, таблиць або чеків. Підтримує CSV, PDF, OFX та зображення до 10 МБ.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Перегляд доходів та витрат для {ledgerName}. Відстежуйте доходи, витрати та прибутковість з часом.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Переглядайте та фільтруйте всі транзакції в {ledgerName}. Шукайте за датою, рахунком, описом або отримувачем.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Фінансова панель для {ledgerName}. Переглядайте баланси рахунків, тренди чистої вартості та підсумки доходів/витрат.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Виконуйте запити BQL (Beancount Query Language) до {ledgerName}. Фільтруйте та аналізуйте фінансові дані з синтаксисом, схожим на SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Налаштуйте параметри для {ledgerName}. Керуйте операційними валютами, співробітниками та налаштуваннями конфіденційності.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Перегляд статистики книги для {ledgerName}. Аналізуйте кількість транзакцій, використання рахунків та метрики якості даних.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Перегляд пробного балансу для {ledgerName}. Переконайтеся, що дебети дорівнюють кредитам по всіх рахунках.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Завантажте файли до {ledgerName}. Імпортуйте існуючі файли або документи Beancount.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Проводки",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Баланс",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.cashFlow": {
    message: "Рух грошових коштів",
    description: "Link label for cash flow page",
  },
  "common.relatedLinks.commodities": {
    message: "Товари",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Створити файл",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Документи",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Помилки",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Події",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Файли",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Володіння",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Імпорт",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Звіт про прибутки",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Журнал",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Огляд",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Запит",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Статистика",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Пробний баланс",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Завантажити файли",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "Історія версій",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Результати",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Рядки",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Успіх",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Активи",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "За собівартістю",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "За ринковою вартістю",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Звіти",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Розширене",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Допомога та підтримка",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Центр допомоги",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Перегляньте посібники та документацію",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Підтримка спільноти",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Запитайте спільноту в Telegram",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "Запропонувати функцію",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "Поділіться ідеями або повідомте про помилки на GitHub",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "Баланс Sheet",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Очистити all",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Конвертовано в",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Вaily",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Власний капітал",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Помилка loading data",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Витрати",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Не вдалося завантажити параметри фільтрів",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Фільтрувати за тегом, отримувачем, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Детальна розбивка {ledgerName} {sectionName} зі значеннями в USD та інших товарах",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Список {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Ієрархія {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Візуальне представлення складу {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Доходи",
    description: "Income category in accounting",
  },
  "common.cashFlow": {
    message: "Рух грошових коштів",
    description: "Navigation label for cash flow financial report",
  },
  "common.incomeStatement": {
    message: "Звіт про прибутки та збитки",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Зобов'язання",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Чистий прибуток",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Чиста вартість",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Рахунків не знайдено",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Пошук файлів...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Файлів не знайдено",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Дані недоступні",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "Немає даних для вибраних фільтрів",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Збігів не знайдено",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Огляд",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Спробуйте ще раз пізніше",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Щокварталу",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Пошук accounts...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Виберіть конвертацію",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Виберіть часовий період",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Час",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Пробний баланс",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Тип to search...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Одиниці",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Щороку",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Рахунок",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Помилка",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Сесію завершено",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Термін дії вашої сесії входу закінчився. Увійдіть знову, щоб продовжити.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Увійдіть, щоб продовжити.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "У вас немає прав для виконання цієї дії.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "Запитаний ресурс не знайдено.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message: "Деякі введені дані недійсні. Перевірте їх і спробуйте ще раз.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "Перевірка даних не пройдена. Перевірте введені дані та спробуйте ще раз.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Ця зміна конфліктує з поточним станом. Оновіть сторінку та спробуйте ще раз.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Забагато запитів. Зачекайте трохи та спробуйте ще раз.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Сталася помилка з нашого боку. Спробуйте пізніше.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "Сервіс тимчасово недоступний. Повторіть спробу незабаром.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message: "Ви досягли ліміту вашого тарифу. Оновіть тариф, щоб продовжити.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Ця дія заборонена.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Ця функція потребує підписки Premium.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Проблема зі з'єднанням. Перевірте інтернет-з'єднання та спробуйте ще раз.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Щось пішло не так. Спробуйте ще раз.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Щось пішло не так",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message: "Не вдалося відобразити цей розділ. Решта сторінки має працювати.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Копіювати код",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Скопійовано до буфера обміну",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Не вдалося скопіювати",
    description: "Toast when copying to the clipboard failed",
  },
};

export default ukCommon;
