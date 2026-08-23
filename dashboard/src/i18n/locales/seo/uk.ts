export interface TranslationEntry {
  message: string;
  description: string;
}

const ukSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Завершення вашого входу до Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Вхід",
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
      "Ваша панель Beancount. Отримуйте доступ до своїх книг та керуйте своїми фінансовими даними.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Панель",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "При завантаженні цієї сторінки сталася помилка. Будь ласка, спробуйте ще раз або поверніться на головну сторінку.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Помилка",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Безпечно скиньте пароль Beancount.io. Ми надішлемо одноразове посилання — потім поверніться до своїх книг.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Скинути пароль Beancount — Безпечний доступ та відновлення",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Професійний облік у текстовому форматі з Beancount. Відстежуйте фінанси, керуйте книгами та генеруйте звіти з потужним, точним, перевіряємим обліком.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Облік у Текстовому Форматі",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Деталі рахунку та історія транзакцій для {accountName} в {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Задавайте питання про фінансові дані {ledgerName} за допомогою ШІ. Аналізуйте транзакції, досліджуйте залишки на рахунках, розумійте тенденції та отримуйте миттєві бухгалтерські інсайти.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Запитати про {ledgerName} - Фінансовий ШІ-асистент",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Звіт про баланс для {ledgerName}. Переглядайте активи, зобов'язання та власний капітал з першого погляду.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Баланс - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Список товарів та ціни для {ledgerName}. Відстежуйте валюти, акції та інші активи.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Товари - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Переглядайте історію комітів та керування версіями для {ledgerName}. Відстежуйте зміни у файлах книги з часом.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Коміти - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerCommit.description": {
    message:
      "Changes in commit {shortSha} for {ledgerName}. Review modified files and diffs.",
    description: "Commit detail page meta description",
  },
  "seo.ledgerCommit.title": {
    message: "Commit {shortSha} - {ledgerName}",
    description: "Commit detail page title with short hash and ledger name",
  },

  "seo.ledgerDashboard.description": {
    message:
      "Переглядайте та керуйте всіма своїми книгами Beancount. Створюйте нові книги, отримуйте доступ до існуючих та організовуйте свої фінансові записи.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Мої Книги",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Вкладення документів та квитанції для {ledgerName}. Організуйте підтверджуючі файли для своїх транзакцій.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Документи - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Помилки валідації та попередження для {ledgerName}. Перегляньте та виправте проблеми у вашій книзі.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Помилки - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Хронологія подій для {ledgerName}. Відстежуйте важливі фінансові події та етапи.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Події - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Переглядайте облікові файли Beancount для {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Файли - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Створіть новий файл в {ledgerName}. Додайте рахунки, транзакції або інші записи Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Створити Файл - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Завантажте файли до {ledgerName}. Імпортуйте існуючі файли або документи Beancount.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Завантажити Файли - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Перегляньте публічні приклади та шаблони книг Beancount. Знайдіть натхнення для власного налаштування відстеження фінансів.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Галерея Книг",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Інвестиційні володіння та портфель для {ledgerName}. Переглядайте поточні позиції та оцінки.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Володіння - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Імпортуйте транзакції до {ledgerName} з CSV, PDF, OFX або зображень. Аналіз за допомогою ШІ для банківських виписок та чеків.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Розумний імпорт - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Звіт про прибутки та збитки для {ledgerName}. Відстежуйте дохід, витрати та чистий прибуток з часом.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Звіт про Прибутки - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Журнал транзакцій для {ledgerName}. Переглядайте, шукайте та фільтруйте всі свої облікові записи.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Журнал - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Фінансовий огляд та звіти для {ledgerName}. Переглядайте чисту вартість, дохід, витрати та розподіл активів.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Огляд - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Переглядайте зміни в pull request для {ledgerName}. Схвалюйте або відхиляйте запропоновані зміни у своїй книзі.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request №{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Підключіть банківські рахунки до {ledgerName} за допомогою Plaid. Автоматично імпортуйте транзакції та синхронізуйте фінансові дані.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Підключені рахунки - {ledgerName}",
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
      "Запитайте {ledgerName} із синтаксисом BQL. Виконуйте власні запити та аналізуйте свої фінансові дані.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL Запит - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Налаштуйте параметри книги для {ledgerName}. Керуйте уподобаннями книги, доступом та опціями.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Налаштування книги - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Статистичний аналіз для {ledgerName}. Переглядайте метрики, тренди та insights з ваших фінансових даних.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Статистика - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Звіт про пробний баланс для {ledgerName}. Перевірте рівність дебетів та кредитів у ваших рахунках.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Пробний Баланс - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Увійдіть у Beancount.io — облік у текстовому форматі з відкритим кодом та Git. Керуйте книгами, імпортуйте банки та тримайте книги перевіреними.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Увійти в Beancount — Безкоштовний облік у текстовому форматі",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Вихід з вашого облікового запису Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Вийти",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "Сторінка, яку ви шукаєте, не існує. Можливо, вона була переміщена або видалена.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Сторінка не знайдена",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Створіть новий пароль для свого облікового запису Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Скинути Пароль",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Оновіть інформацію профілю, мовні уподобання та загальні налаштування облікового запису.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Загальні Налаштування",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Керуйте SSH ключами для безпечного доступу до своїх книг Beancount через Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH Ключі",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Небезпечна зона",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Керуйте деструктивними діями облікового запису, такими як остаточне видалення вашого облікового запису та всіх даних.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Створіть безкоштовний обліковий запис Beancount.io. Відстежуйте фінанси з книгами в текстовому форматі, звітами Fava, імпортом банків і контролем версій — без прив'язки.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Створити безкоштовний обліковий запис Beancount — Облік з Git",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Підтвердьте свою електронну адресу, щоб завершити реєстрацію облікового запису Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Підтвердити Email",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Ласкаво Просимо to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Ласкаво Просимо",
    description: "Welcome page title",
  },
};

export default ukSeo;
