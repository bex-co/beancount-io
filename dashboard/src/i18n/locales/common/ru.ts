export interface TranslationEntry {
  message: string;
  description: string;
}

const ruCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Счёт",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Транзакции",
    description: "Plural form of transaction",
  },
  "common.adminPermissionRequired": {
    message: "Для доступа к этой странице требуются права администратора.",
    description: "Specific message for admin-only pages",
  },
  "common.anErrorOccurred": {
    message: "Произошла ошибка",
    description: "Generic error message",
  },
  "common.back": {
    message: "Назад",
    description: "Button label to go back to previous page",
  },
  "common.backToLedger": {
    message: "Вернуться к книге",
    description: "Button text to go back to ledger overview",
  },
  "common.beancountDashboard": {
    message: "Панель Beancount",
    description: "Main application title",
  },
  "common.beancountLogo": {
    message: "Логотип Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Отмена",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Очистить",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Закрыть",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Лимит сотрудников",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Лимит сотрудников достигнут",
    description: "Title when collaborator limit is reached",
  },
  "common.collaboratorsLimitReachedMessage": {
    message:
      "Вы достигли лимита в {max} сотрудников. Обновитесь до Premium, чтобы добавить больше сотрудников в вашу книгу.",
    description: "Message when collaborator limit is reached",
  },
  "common.collaboratorsUsed": {
    message: "{used} из {max} сотрудников",
    description: "Shows current collaborator usage",
  },
  "common.confirm": {
    message: "Подтвердить",
    description: "Button label to confirm action",
  },
  "common.copied": {
    message: "Скопировано",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Копировать",
    description: "Button label to copy content",
  },
  "common.dashboardTagline": {
    message: "Текстовый учёт. Мощный, Точный, Проверяемый.",
    description: "Tagline describing the application",
  },
  "common.delete": {
    message: "Удалить",
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
  "common.done": {
    message: "Готово",
    description: "Button label indicating completion",
  },
  "common.edit": {
    message: "Редактировать",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Мы столкнулись с неожиданной ошибкой. Пожалуйста, попробуйте снова или вернитесь на предыдущую страницу.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Детали ошибки",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Произошла ошибка",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Что-то пошло не так",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Не удалось загрузить данные",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadDataDescription": {
    message:
      "Не удалось получить информацию о вашей книге. Проверьте соединение и попробуйте снова.",
    description: "Error description when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Не удалось загрузить книгу",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Вернуться",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "На главную",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Перейти на следующую страницу",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Перейти на предыдущую страницу",
    description: "Aria label for previous page button",
  },
  "common.home": {
    message: "Главная",
    description: "Navigation label for home page",
  },
  "common.insufficientPermissions": {
    message: "Недостаточно прав",
    description: "Error title when user lacks required permissions",
  },
  "common.insufficientPermissionsDescription": {
    message:
      "У вас нет необходимых прав для доступа к этой странице. Пожалуйста, обратитесь к администратору книги для получения доступа.",
    description: "Error description when user lacks required permissions",
  },
  "common.import": {
    message: "Импорт",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Добавить запись",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Транзакция, баланс или заметка",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Умный импорт",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Банковские выписки, CSV, PDF или сканы",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Подключить банк",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Автоматически синхронизировать транзакции",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Загрузить чек",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Сканировать чек с помощью ИИ",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Неверные параметры URL",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Предоставленные параметры URL недействительны. Пожалуйста, проверьте ссылку и попробуйте снова.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Последнее обновление",
    description: "Table column header for last update time",
  },
  "common.ledger": {
    message: "Книга",
    description: "Navigation label for ledger page",
  },
  "common.ledgerSettings": {
    message: "Настройки книги",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Лимит книг",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Лимит книг достигнут",
    description: "Title when ledger limit is reached",
  },
  "common.ledgersUsed": {
    message: "{used} из {max} книг использовано",
    description: "Shows current ledger usage",
  },
  "common.loading": {
    message: "загрузка...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Загрузка данных...",
    description: "Generic loading state message",
  },
  "common.mine": {
    message: "Мой",
    description: "Navigation label for user profile section",
  },
  "common.morePages": {
    message: "Больше страниц",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Имя",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "близко к лимиту",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Сбой сетевого соединения",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Не удалось подключиться к серверу. Проверьте интернет-соединение и попробуйте снова.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Далее",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Далее",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Данные не найдены.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Результаты не найдены.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Прочее",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Владелец",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Страница не найдена",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message: "Страница, которую вы ищете, не существует или была перемещена.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "пагинация",
    description: "Aria label for pagination navigation",
  },
  "common.pleaseRetryLater": {
    message: "Пожалуйста, попробуйте позже",
    description: "Suggestion message after error",
  },
  "common.premiumBenefit.collaborators": {
    message: "Добавьте до 5 сотрудников на книгу",
    description: "Premium benefit for more collaborators",
  },
  "common.premiumBenefit.ledgers": {
    message: "Создайте до 5 книг вместо 1",
    description: "Premium benefit for more ledgers",
  },
  "common.premiumBenefit.moreCollaborators": {
    message: "Пригласите до 5 сотрудников вместо 2",
    description: "Premium benefit for more collaborators",
  },
  "common.premiumBenefit.unlimitedFeatures": {
    message: "Доступ к расширенным функциям и приоритетной поддержке",
    description: "Premium benefit for unlimited features",
  },
  "common.premiumBenefits": {
    message: "Преимущества Premium",
    description: "Section title for list of premium benefits",
  },
  "common.previous": {
    message: "Предыдущая",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Связанные страницы",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Сохранить",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Сохранение...",
    description: "Saving state message",
  },
  "common.search": {
    message: "Поиск",
    description: "Button or input label for search functionality",
  },
  "common.seeAlso": {
    message: "Связанные страницы",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Выберите вид",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Выберите дату",
    description: "Screen reader label for date picker button",
  },
  "common.setting": {
    message: "Настройка",
    description: "Singular form of settings",
  },
  "common.settings": {
    message: "Настройки",
    description: "Navigation label for settings page",
  },
  "common.share": {
    message: "Поделиться",
    description: "Button label to share content",
  },
  "common.sidebar": {
    message: "Боковая панель",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Отображает мобильную боковую панель.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Звёзды",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Статус",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Переключить боковую панель",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Попробовать снова",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "Произошла непредвиденная ошибка при загрузке книги.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Неизвестно",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "обновление...",
    description: "Updating state message",
  },
  "common.upgradeNow": {
    message: "Обновить Сейчас",
    description: "Button text to upgrade immediately",
  },
  "common.upgradeToPremium": {
    message: "Обновить до Premium",
    description: "Title for upgrade prompt dialog",
  },
  "common.upgradeToPro": {
    message: "Перейти на Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Обновите, чтобы разблокировать",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "пользователь@пример.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Пользователь",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Скачать",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Ещё действия",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Подробнее",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Просмотр детальной информации о счете для {ledgerName}. Анализируйте транзакции, балансы и историю счета.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Задавайте вопросы о финансовых данных {ledgerName} с помощью ИИ. Анализируйте транзакции, изучайте остатки на счетах, понимайте тенденции и получайте мгновенные бухгалтерские инсайты.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Просмотр баланса для {ledgerName}. Анализируйте активы, обязательства и капитал в любой момент времени.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.collaborators": {
    message:
      "Управляйте сотрудниками для {ledgerName}. Приглашайте пользователей и контролируйте права доступа.",
    description: "Description for collaborators page",
  },
  "common.pageDescription.commodities": {
    message:
      "Просматривайте и управляйте товарами (валютами, акциями и активами), используемыми в {ledgerName}. Отслеживайте обменные курсы и историю цен.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Создайте новый файл в {ledgerName}. Добавьте файлы книги Beancount или документы в свой репозиторий.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Просматривайте документы, прикрепленные к транзакциям в {ledgerName}. Просматривайте квитанции, счета и подтверждающую документацию.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Просмотр ошибок парсинга и валидации в {ledgerName}. Исправьте проблемы, чтобы обеспечить точные финансовые отчеты.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Просматривайте важные события и вехи в {ledgerName}. Отслеживайте открытие, закрытие счетов и события жизненного цикла.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Просматривайте и редактируйте исходные файлы Beancount в {ledgerName}. Управляйте планом счетов и историей транзакций.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Анализируйте свои текущие владения и портфель в {ledgerName}. Просматривайте распределение активов, рыночные стоимости и нереализованную прибыль.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Добавьте транзакции в {ledgerName} из банковских выписок, таблиц или чеков. Поддерживает CSV, PDF, OFX и изображения до 10 МБ.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Просмотр доходов и расходов для {ledgerName}. Отслеживайте доходы, затраты и рентабельность с течением времени.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Просматривайте и фильтруйте все транзакции в {ledgerName}. Ищите по дате, счету, описанию или получателю.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Финансовая панель для {ledgerName}. Просматривайте балансы счетов, тренды чистой стоимости и сводки доходов/расходов.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Выполняйте запросы BQL (Beancount Query Language) к {ledgerName}. Фильтруйте и анализируйте финансовые данные с синтаксисом, похожим на SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Настройте параметры для {ledgerName}. Управляйте операционными валютами, сотрудниками и настройками конфиденциальности.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Просмотр статистики книги для {ledgerName}. Анализируйте количество транзакций, использование счетов и метрики качества данных.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Просмотр пробного баланса для {ledgerName}. Убедитесь, что дебеты равны кредитам по всем счетам.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Загрузите файлы в {ledgerName}. Импортируйте существующие файлы или документы Beancount.",
    description: "Description for upload files page",
  },
  "common.pageDescription.versionHistory": {
    message:
      "Просмотр истории коммитов для {ledgerName}. Отслеживайте изменения в файлах книги с течением времени.",
    description: "Description for version history page",
  },
  "common.postings": {
    message: "Проводки",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.account": {
    message: "Счет",
    description: "Link label for account page",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Баланс",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.collaborators": {
    message: "Сотрудники",
    description: "Link label for collaborators page",
  },
  "common.relatedLinks.commodities": {
    message: "Товары",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Создать файл",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Документы",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Ошибки",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "События",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Файлы",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Владения",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Импорт",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Отчет о прибылях",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Журнал",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Обзор",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Запрос",
    description: "Link label for query page",
  },
  "common.relatedLinks.settings": {
    message: "Настройки",
    description: "Link label for settings page",
  },
  "common.relatedLinks.statistics": {
    message: "Статистика",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Пробный баланс",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Загрузить файлы",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "История версий",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Результаты",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Строки",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Успешно",
    description: "Auto-generated from code usage",
  },
  "common.amount": {
    message: "Сумма",
    description: "Label for amount column in tables",
  },
  "common.assets": {
    message: "Активы",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "По себестоимости",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "По рыночной стоимости",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Отчёты",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Дополнительно",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.needHelp": {
    message: "Нужна помощь?",
    description: "Navigation label for the external help link",
  },
  "common.helpAndSupport": {
    message: "Помощь и поддержка",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Справочный центр",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Просмотрите руководства и документацию",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Поддержка сообщества",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Задайте вопрос сообществу в Telegram",
    description: "Description for the community support menu item",
  },
  "common.balanceSheet": {
    message: "Баланс Sheet",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Очистить all",
    description: "Button text to clear all filters",
  },
  "common.commodities": {
    message: "Товары",
    description: "Label for commodities column in tables",
  },
  "component.conversionSelect.convertedTo": {
    message: "Конвертировано в",
    description: "Prefix for currency conversion option",
  },
  "common.currency": {
    message: "Валюта",
    description: "Label for currency column in tables",
  },
  "component.intervalSelect.daily": {
    message: "Ежедневно",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Собственный капитал",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Ошибка загрузки данных",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Расходы",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Не удалось загрузить параметры фильтрации",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Фильтр по тегу, получателю платежа, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Подробная разбивка {ledgerName} {sectionName} со значениями в USD и других товарах",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Список {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Иерархия {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Визуальное представление состава {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Доходы",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "Доход Statement",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Обязательства",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Чистая прибыль",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Чистая стоимость",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Счета не найдены",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Поиск файлов...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Файлы не найдены",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Данные недоступны",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "Нет данных для выбранных фильтров",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Совпадения не найдены",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Обзор",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Пожалуйста, попробуйте позже",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Ежеквартально",
    description: "Quarterly interval option",
  },
  "common.savings": {
    message: "Сбережения",
    description: "Label for savings node in cash flow diagram",
  },
  "component.accountCombobox.placeholder": {
    message: "Поиск счетов...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Выберите конвертацию",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Выберите временной период",
    description: "Placeholder for interval select dropdown",
  },
  "common.summary": {
    message: "Сводка",
    description: "Label for summary section or table",
  },
  "component.searchControls.time": {
    message: "Время",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Оборотно-сальдовая ведомость",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Введите для поиска...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Единицы",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Ежегодно",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Счёт",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Ошибка",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Сессия истекла",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Срок действия вашей сессии входа истёк. Войдите снова, чтобы продолжить.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Войдите, чтобы продолжить.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "У вас нет прав для выполнения этого действия.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "Запрошенный ресурс не найден.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Некоторые введённые данные недействительны. Проверьте их и попробуйте снова.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "Проверка данных не пройдена. Проверьте введённые данные и попробуйте снова.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Это изменение конфликтует с текущим состоянием. Обновите страницу и попробуйте снова.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Слишком много запросов. Подождите немного и попробуйте снова.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Произошла ошибка на нашей стороне. Попробуйте позже.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "Сервис временно недоступен. Повторите попытку чуть позже.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "Вы достигли лимита вашего тарифа. Обновите тариф, чтобы продолжить.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Это действие запрещено.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Эта функция требует подписки Premium.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Проблема с подключением. Проверьте интернет-соединение и попробуйте снова.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Что-то пошло не так. Попробуйте снова.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Что-то пошло не так",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "Не удалось отобразить этот раздел. Остальная часть страницы должна работать.",
    description: "Body of the error boundary fallback panel",
  },
};

export default ruCommon;
