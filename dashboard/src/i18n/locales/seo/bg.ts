export interface TranslationEntry {
  message: string;
  description: string;
}

const bgSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Завършване на вашия вход в Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Влизане",
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
      "Вашето табло на Beancount. Достъпвайте книгите си и управлявайте финансовите си данни.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Табло",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "Възникна грешка при зареждането на тази страница. Моля, опитайте отново или се върнете на началната страница.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Грешка",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Нулирайте сигурно паролата си за Beancount.io. Ще ви изпратим еднократна връзка — след това се върнете към книгите си.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Нулиране на парола за Beancount — Сигурен достъп",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Професионално счетоводство с обикновен текст с Beancount. Проследявайте финанси, управлявайте книги и генерирайте отчети с мощно, точно, одитируемо счетоводство.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Счетоводство с Обикновен Текст",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Детайли на сметката и история на транзакциите за {accountName} в {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Задавайте въпроси за финансовите данни на {ledgerName} с помощта на ИИ. Анализирайте транзакции, разглеждайте салда по сметки, разбирайте тенденции и получавайте мигновени счетоводни прозрения.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Попитайте за {ledgerName} - AI финансов асистент",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Отчет за баланса на {ledgerName}. Преглеждайте активи, пасиви и капитал с един поглед.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Баланс - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCashFlow.description": {
    message:
      "Отчет за паричния поток за {ledgerName}. Проследявайте оперативните, инвестиционните и финансовите парични движения във времето.",
    description: "Cash flow page meta description",
  },
  "seo.ledgerCashFlow.title": {
    message: "Паричен поток - {ledgerName}",
    description: "Cash flow page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Списък на стоките и цени за {ledgerName}. Проследявайте валути, акции и други активи.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Стоки - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Преглеждайте историята на комитите и контрола на версиите за {ledgerName}. Проследявайте промените във файловете на вашата книга с течение на времето.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Комити - {ledgerName}",
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

  "seo.ledgerDocuments.description": {
    message:
      "Прикачени документи и разписки за {ledgerName}. Организирайте подкрепящи файлове за вашите транзакции.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Документи - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Грешки при валидация и предупреждения за {ledgerName}. Прегледайте и коригирайте проблеми в книгата си.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Грешки - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Хронология на събитията за {ledgerName}. Проследявайте важни финансови събития и етапи.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Събития - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Преглеждайте счетоводните файлове на Beancount за {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Файлове - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Създайте нов файл в {ledgerName}. Добавете сметки, транзакции или други записи на Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Създай Файл - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Качете файлове към {ledgerName}. Импортирайте съществуващи файлове или документи на Beancount.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Качи Файлове - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Разглеждайте публични примери и шаблони на книги в Beancount. Намерете вдъхновение за вашата собствена настройка за проследяване на финанси.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Галерия на Книгите",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Инвестиционни притежания и портфолио за {ledgerName}. Преглеждайте текущи позиции и оценки.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Притежания - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Импортирайте транзакции в {ledgerName} от CSV, PDF, OFX или изображения. AI анализ за банкови извлечения и разписки.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Умен импорт - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Отчет за доходите на {ledgerName}. Проследявайте приходи, разходи и нетна печалба във времето.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Отчет за Доходите - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Дневник на транзакциите за {ledgerName}. Преглеждайте, търсете и филтрирайте всички ваши счетоводни записи.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Дневник - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Финансов преглед и отчети за {ledgerName}. Преглеждайте нетна стойност, приходи, разходи и разпределение на активи.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Общ Преглед - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Прегледайте промените в pull request за {ledgerName}. Одобрявайте или отхвърляйте предложените модификации във вашата книга.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request №{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Свържете банкови сметки към {ledgerName} чрез Plaid. Автоматично импортирайте транзакции и синхронизирайте финансови данни.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Свързани акаунти - {ledgerName}",
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
      "Запитайте {ledgerName} със синтаксис BQL. Изпълнявайте персонализирани заявки и анализирайте финансовите си данни.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL Заявка - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Конфигурирайте настройки за книга {ledgerName}. Управлявайте предпочитания, достъп и опции на книгата.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Настройки на книга - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Статистически анализ за {ledgerName}. Преглеждайте метрики, тенденции и прозрения от вашите финансови данни.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Статистики - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Отчет за пробния баланс на {ledgerName}. Проверете равенството на дебити и кредити в сметките си.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Пробен Баланс - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Влезте в Beancount.io — счетоводство с обикновен текст с отворен код, поддържано от Git. Управлявайте книги, импортирайте банки и поддържайте книгите си проверими.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Вход в Beancount — Безплатно счетоводство с обикновен текст",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Излизане от акаунта ви в Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Изход",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "Страницата, която търсите, не съществува. Възможно е да е преместена или изтрита.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Страницата не е намерена",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Създайте нова парола за акаунта си в Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Нулиране на Парола",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Актуализирайте информацията на профила си, езиковите предпочитания и общите настройки на акаунта.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Общи Настройки",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Управлявайте SSH ключове за сигурен достъп до вашите книги в Beancount чрез Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH Ключове",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Опасна зона",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Управлявайте деструктивни действия с акаунта като перманентно изтриване на акаунта и всички данни.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Създайте своя безплатен акаунт в Beancount.io. Проследявайте финансите си с книги с обикновен текст, отчети на Fava, банков импорт и контрол на версиите — без обвързване.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Създаване на безплатен Beancount акаунт — Счетоводство с Git",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Потвърдете имейл адреса си, за да завършите регистрацията на акаунта си в Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Потвърди Имейл",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Добре Дошли to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Добре Дошли",
    description: "Welcome page title",
  },
};

export default bgSeo;
