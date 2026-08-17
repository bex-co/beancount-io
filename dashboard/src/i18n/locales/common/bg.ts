export interface TranslationEntry {
  message: string;
  description: string;
}

const bgCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Сметка",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Транзакции",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Назад",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Лого на Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Отказ",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Изчистване",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Затваряне",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Лимит на сътрудници",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Лимитът на сътрудници е достигнат",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Копирано",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Копиране",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Изтриване",
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
    message: "Редактиране",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Срещнахме неочаквана грешка. Моля, опитайте отново или се върнете на предишната страница.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Детайли за грешката",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Възникна грешка",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Нещо се обърка",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Неуспешно зареждане на данни",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Неуспешно зареждане на книгата",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Назад",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Към начало",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Към следващата страница",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Към предишната страница",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Импорт",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Добавяне на запис",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Транзакция, баланс или бележка",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Умен импорт",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Банкови извлечения, CSV, PDF или сканирания",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Свържи банка",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Автоматично синхронизиране на транзакции",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Качи разписка",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Сканирайте разписка с ИИ",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Невалидни URL параметри",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Предоставените URL параметри не са валидни. Моля, проверете връзката и опитайте отново.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Последно актуализирано",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Настройки на книга",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Лимит на регистри",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Лимитът на регистри е достигнат",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "зареждане...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Зареждане на данни...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Още страници",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Име",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "близо до лимита",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Грешка при мрежова връзка",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Не може да се свърже със сървъра. Моля, проверете интернет връзката си и опитайте отново.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Напред",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Следваща",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Няма намерени данни.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Няма намерени резултати.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Други",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Собственик",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Страницата не е намерена",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "Страницата, която търсите, не съществува или е била преместена на друго място.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "страниране",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Предишна",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Свързани страници",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Запазване",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Запазване...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Свързани страници",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Изберете изглед",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Изберете дата",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Настройки",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Странична лента",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Показва мобилната странична лента.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Звезди",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Състояние",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Превключване на страничната лента",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Опитай отново",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "Възникна неочаквана грешка при зареждане на книгата.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Неизвестно",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "актуализиране...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Надстройте до Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Надградете, за да отключите",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "потребител@example.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Потребител",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Изтегляне",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Още действия",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Научете повече",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Преглед на подробна информация за сметка за {ledgerName}. Анализирайте транзакции, салда и история на сметката.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Задавайте въпроси за финансовите данни на {ledgerName} с помощта на ИИ. Анализирайте транзакции, разглеждайте салда по сметки, разбирайте тенденции и получавайте мигновени счетоводни прозрения.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Преглед на баланса за {ledgerName}. Анализирайте активи, пасиви и капитал за всеки момент.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "Преглеждайте и управлявайте стоки (валути, акции и активи), използвани в {ledgerName}. Проследявайте обменни курсове и ценова история.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Създайте нов файл в {ledgerName}. Добавете файлове на Beancount книга или документи към хранилището си.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Преглеждайте документи, прикачени към транзакции в {ledgerName}. Прегледайте квитанции, фактури и подкрепяща документация.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Преглед на грешки при парсване и валидация в {ledgerName}. Поправете проблеми, за да осигурите точни финансови отчети.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Преглеждайте важни събития и етапи в {ledgerName}. Проследявайте отваряне, затваряне на сметки и жизнени цикъл събития.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Преглеждайте и редактирайте изходни файлове на Beancount в {ledgerName}. Управлявайте сметкоплана и историята на транзакциите.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Анализирайте текущите си притежания и портфолио в {ledgerName}. Преглеждайте разпределение на активи, пазарни стойности и нереализирани печалби.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Добавете транзакции към {ledgerName} от банкови извлечения, електронни таблици или разписки. Поддържа CSV, PDF, OFX и изображения до 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Преглед на приходи и разходи за {ledgerName}. Проследявайте приходи, разходи и рентабилност във времето.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Преглеждайте и филтрирайте всички транзакции в {ledgerName}. Търсете по дата, сметка, описание или получател.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Финансово табло за {ledgerName}. Преглед на салда по сметки, тенденции в нетната стойност и обобщения на приходи/разходи.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Изпълнявайте BQL (Beancount Query Language) заявки към {ledgerName}. Филтрирайте и анализирайте финансовите си данни със SQL-подобен синтаксис.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Конфигурирайте настройки за {ledgerName}. Управлявайте работни валути, сътрудници и настройки за поверителност.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Преглед на статистики на книгата за {ledgerName}. Анализирайте брой транзакции, използване на сметки и метрики за качество на данните.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Преглед на пробния баланс за {ledgerName}. Проверете дебити и кредити във всички сметки.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Качете файлове към {ledgerName}. Импортирайте съществуващи файлове или документи на Beancount.",
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
  "common.relatedLinks.commodities": {
    message: "Стоки",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Създаване на файл",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Документи",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Грешки",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Събития",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Файлове",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Притежания",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Импортиране",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Отчет за доходите",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Дневник",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Общ преглед",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Заявка",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Статистики",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Пробен баланс",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Качване на файлове",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "История на версиите",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Резултати",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Редове",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Успех",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Активи",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "По цена",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "По пазарна стойност",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Отчети",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Разширени",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Помощ и поддръжка",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Център за помощ",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Разгледайте ръководства и документация",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Поддръжка от общността",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Попитайте общността в Telegram",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "Предложете функция",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "Споделете идеи или докладвайте за грешки в GitHub",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "Баланс",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Изчистване на всички",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Преобразувано в",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Дневно",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Собствен капитал",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Грешка при зареждане на данни",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Разходи",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Неуспешно зареждане на опциите за филтриране",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Филтриране по етикет, получател, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Подробна разбивка на {ledgerName} {sectionName} със стойности в USD и други стоки",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Списък {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Йерархия {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Визуално представяне на състава на {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Доходи",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "Отчет за доходите",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Пасиви",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Нетна печалба",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Нетна стойност",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Няма намерени сметки",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Търсене на файлове...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Няма намерени файлове",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Няма налични данни",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "Няма данни за избраните филтри",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Няма намерени съвпадения",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Преглед",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Моля, опитайте отново по-късно",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Тримесечно",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Търсене на сметки...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Изберете преобразуване",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Изберете времеви период",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Време",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Оборотна ведомост",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Въведете за търсене...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Единици",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Годишно",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Сметка",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Грешка",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Сесията изтече",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Сесията ви за вход изтече. Моля, влезте отново, за да продължите.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Влезте, за да продължите.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "Нямате права да извършите това действие.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "Заявеният ресурс не е намерен.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Част от въведените данни са невалидни. Проверете ги и опитайте отново.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "Валидацията е неуспешна. Проверете въведените данни и опитайте отново.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Тази промяна е в конфликт с текущото състояние. Опреснете страницата и опитайте отново.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Твърде много заявки. Изчакайте малко и опитайте отново.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Възникна грешка от наша страна. Опитайте отново по-късно.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "Услугата временно не е достъпна. Опитайте отново след малко.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message: "Достигнахте лимита на вашия план. Надградете, за да продължите.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Това действие не е разрешено.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Тази функция изисква Premium абонамент.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Проблем с връзката. Проверете интернет връзката си и опитайте отново.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Нещо се обърка. Опитайте отново.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Нещо се обърка",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "Тази секция не можа да бъде показана. Останалата част от страницата би трябвало да работи.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Копиране на кода",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Копирано в клипборда",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Неуспешно копиране",
    description: "Toast when copying to the clipboard failed",
  },
};

export default bgCommon;
