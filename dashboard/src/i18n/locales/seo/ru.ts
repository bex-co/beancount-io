export interface TranslationEntry {
  message: string;
  description: string;
}

const ruSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Завершение входа в Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Вход",
    description: "Auth callback page title",
  },
  "seo.deviceAuth.description": {
    message: "Authorize CLI access to your Beancount account.",
    description: "Device auth page meta description",
  },
  "seo.deviceAuth.title": {
    message: "Authorize CLI Access",
    description: "Device auth page title",
  },
  "seo.dashboard.description": {
    message:
      "Ваша панель Beancount. Получайте доступ к вашим книгам и управляйте финансовыми данными.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Панель",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "При загрузке страницы произошла ошибка. Пожалуйста, попробуйте снова или вернитесь на главную страницу.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Ошибка",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Сбросьте пароль вашего аккаунта Beancount, введя ваш адрес электронной почты.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Забыли Пароль",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Профессиональный учет в текстовом формате с Beancount. Отслеживайте финансы, управляйте книгами и создавайте отчеты с мощным, точным и проверяемым учетом.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Учет в Текстовом Формате",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Детали счета и история транзакций для {accountName} в {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Задавайте вопросы о финансовых данных {ledgerName} с помощью ИИ. Анализируйте транзакции, изучайте остатки на счетах, понимайте тенденции и получайте мгновенные бухгалтерские инсайты.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Вопросы о {ledgerName} - Финансовый ИИ-ассистент",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Отчет о балансе для {ledgerName}. Просматривайте активы, обязательства и капитал с первого взгляда.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Баланс - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCollaborators.description": {
    message:
      "Управляйте сотрудниками для {ledgerName}. Приглашайте пользователей и контролируйте права доступа.",
    description: "Collaborators page meta description",
  },
  "seo.ledgerCollaborators.title": {
    message: "Сотрудники - {ledgerName}",
    description: "Collaborators page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Список товаров и цены для {ledgerName}. Отслеживайте валюты, акции и другие активы.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Товары - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Просмотр истории коммитов и контроля версий для {ledgerName}. Отслеживание изменений в файлах вашей книги.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Коммиты - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerDashboard.description": {
    message:
      "Просматривайте и управляйте всеми вашими книгами Beancount. Создавайте новые книги, получайте доступ к существующим и организуйте финансовые записи.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Мои Книги",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Вложения документов и квитанции для {ledgerName}. Организуйте подтверждающие файлы для ваших транзакций.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Документы - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Ошибки валидации и предупреждения для {ledgerName}. Проверьте и исправьте проблемы в вашей книге.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Ошибки - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Хронология событий для {ledgerName}. Отслеживайте важные финансовые события и этапы.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "События - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message:
      "Редактируйте файлы книги для {ledgerName}. Просматривайте и изменяйте ваши бухгалтерские файлы Beancount.",
    description: "File editor page meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Файлы - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Создайте новый файл в {ledgerName}. Добавьте счета, транзакции или другие записи Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Создать Файл - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Загрузите файлы в {ledgerName}. Импортируйте существующие файлы или документы Beancount.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Загрузить Файлы - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Просмотрите публичные примеры и шаблоны книг Beancount. Найдите вдохновение для своей настройки отслеживания финансов.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Галерея Книг",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Инвестиционные владения и портфель для {ledgerName}. Просматривайте текущие позиции и оценки.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Владения - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Импортируйте транзакции в {ledgerName} из CSV, PDF, OFX или изображений. Анализ с помощью ИИ для банковских выписок и чеков.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Умный импорт - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Отчет о прибылях и убытках для {ledgerName}. Отслеживайте доходы, расходы и чистую прибыль с течением времени.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Отчет о Прибылях - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Журнал транзакций для {ledgerName}. Просматривайте, ищите и фильтруйте все ваши бухгалтерские записи.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Журнал - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Финансовый обзор и отчеты для {ledgerName}. Просматривайте чистую стоимость, доходы, расходы и распределение активов.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Обзор - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Просматривайте изменения pull request для {ledgerName}. Одобряйте или отклоняйте предлагаемые изменения вашей книги.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request №{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Подключите банковские счета к {ledgerName} с помощью Plaid. Автоматически импортируйте транзакции и синхронизируйте финансовые данные.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Подключённые счета - {ledgerName}",
    description: "Plaid settings page title with ledger name",
  },
  "seo.plaidConnections.description": {
    message:
      "Manage your connected bank accounts for {ledgerName} — link new banks, update account mappings, sync, or disconnect.",
    description: "Plaid connections management page meta description",
  },
  "seo.plaidConnections.title": {
    message: "Manage Bank Connections - {ledgerName}",
    description: "Plaid connections management page title with ledger name",
  },
  "seo.ledgerQuery.description": {
    message:
      "Запросите {ledgerName} с синтаксисом BQL. Выполняйте пользовательские запросы и анализируйте ваши финансовые данные.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL Запрос - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Настройте параметры книги для {ledgerName}. Управляйте предпочтениями книги, доступом и опциями.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Настройки книги - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Статистический анализ для {ledgerName}. Просматривайте метрики, тренды и insights из ваших финансовых данных.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Статистика - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Отчет о пробном балансе для {ledgerName}. Проверьте равенство дебетов и кредитов в ваших счетах.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Пробный Баланс - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Войдите в свой аккаунт Beancount для управления финансовыми книгами и бухгалтерскими записями.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Войти",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Выход из вашего аккаунта Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Выйти",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "Страница, которую вы ищете, не существует. Возможно, она была перемещена или удалена.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Страница не найдена",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Создайте новый пароль для вашего аккаунта Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Сбросить Пароль",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Обновите информацию профиля, языковые предпочтения и общие настройки аккаунта.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Общие Настройки",
    description: "General settings page title",
  },
  "seo.settingsIndex.description": {
    message:
      "Управляйте настройками, предпочтениями и конфигурациями вашего аккаунта Beancount.",
    description: "Settings index page meta description",
  },
  "seo.settingsIndex.title": {
    message: "Настройки Аккаунта",
    description: "Settings index page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Управляйте SSH ключами для безопасного доступа к вашим книгам Beancount через Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH Ключи",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Опасная зона",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Управляйте деструктивными действиями учетной записи, такими как окончательное удаление вашей учетной записи и всех данных.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Создайте бесплатный аккаунт Beancount, чтобы начать отслеживать финансы с учетом в текстовом формате.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Создать Аккаунт",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Подтвердите ваш адрес электронной почты для завершения регистрации аккаунта Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Подтвердить Email",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Добро Пожаловать to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Добро Пожаловать",
    description: "Welcome page title",
  },
};

export default ruSeo;
