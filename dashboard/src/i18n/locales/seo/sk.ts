export interface TranslationEntry {
  message: string;
  description: string;
}

const skSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Dokončovanie vášho prihlásenia do Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Prihlasovanie",
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
      "Váš dashboard Beancount. Pristupujte k svojím knihám a spravujte svoje finančné údaje.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Dashboard",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "Pri načítaní tejto stránky sa vyskytla chyba. Skúste to prosím znova alebo sa vráťte na domovskú stránku.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Chyba",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Obnovte heslo svojho účtu Beancount zadaním svojej emailovej adresy.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Zabudnuté Heslo",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Profesionálne účtovníctvo v čistom texte s Beancount. Sledujte financie, spravujte knihy a generujte správy s výkonným, presným, auditovateľným účtovníctvom.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Účtovníctvo v Čistom Texte",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Detaily účtu a história transakcií pre {accountName} v {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Pýtajte sa otázky o finančných údajoch {ledgerName} pomocou AI. Analyzujte transakcie, preskúmajte zostatky účtov, pochopte trendy a získajte okamžité účtovné poznatky.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Opýtať sa na {ledgerName} - AI finančný asistent",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Správa o súvahe pre {ledgerName}. Zobrazujte aktíva, záväzky a vlastné imanie na prvý pohľad.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Súvaha - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Zoznam komodít a ceny pre {ledgerName}. Sledujte meny, akcie a ďalšie aktíva.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Komodity - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Zobrazujte históriu zmien a správu verzií pre {ledgerName}. Sledujte úpravy súborov svojej knihy v priebehu času.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Commity - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerDashboard.description": {
    message:
      "Zobrazujte a spravujte všetky svoje knihy Beancount. Vytvárajte nové knihy, pristupujte k existujúcim a organizujte svoje finančné záznamy.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Moje Knihy",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Prílohy dokumentov a potvrdenia pre {ledgerName}. Organizujte podporné súbory pre vaše transakcie.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Dokumenty - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Validačné chyby a upozornenia pre {ledgerName}. Skontrolujte a opravte problémy vo svojej knihe.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Chyby - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Časová os udalostí pre {ledgerName}. Sledujte dôležité finančné udalosti a míľniky.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Udalosti - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Prehliadajte účtovné súbory Beancount pre {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Súbory - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Vytvorte nový súbor v {ledgerName}. Pridajte účty, transakcie alebo iné zápisy Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Vytvoriť Súbor - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Nahrajte súbory do {ledgerName}. Importujte existujúce súbory alebo dokumenty Beancount.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Nahrať Súbory - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Prehliadajte verejné príklady a šablóny kníh Beancount. Nájdite inšpiráciu pre vlastné nastavenie sledovania financií.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Galéria Kníh",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Investičné držby a portfólio pre {ledgerName}. Zobrazujte aktuálne pozície a ocenenia.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Držby - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Importujte transakcie do {ledgerName} z CSV, PDF, OFX alebo obrázkov. AI analýza pre bankové výpisy a účtenky.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Inteligentný import - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Správa výkazu ziskov a strát pre {ledgerName}. Sledujte príjmy, výdavky a čistý zisk v čase.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Výkaz Ziskov a Strát - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Denník transakcií pre {ledgerName}. Zobrazujte, vyhľadávajte a filtrujte všetky svoje účtovné zápisy.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Denník - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Finančný prehľad a správy pre {ledgerName}. Zobrazujte čisté imanie, príjem, výdavky a distribúciu aktív.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Prehľad - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Skontrolujte zmeny v pull requeste pre {ledgerName}. Schváľte alebo zamietnite navrhované úpravy svojej účtovnej knihy.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request č. {prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Pripojte bankové účty k {ledgerName} pomocou Plaid. Automaticky importujte transakcie a synchronizujte finančné údaje.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Pripojené účty - {ledgerName}",
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
      "Dotazujte sa {ledgerName} so syntaxou BQL. Spúšťajte vlastné dopyty a analyzujte svoje finančné údaje.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL Dopyt - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Konfigurovať nastavenia knihy pre {ledgerName}. Spravujte preferencie knihy, prístup a možnosti.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Nastavenia knihy - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Štatistická analýza pre {ledgerName}. Zobrazujte metriky, trendy a poznatky z vašich finančných údajov.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Štatistiky - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Správa obratovej súvahy pre {ledgerName}. Overte rovnosť debetov a kreditov vo vašich účtoch.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Obratová Súvaha - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Prihláste sa do svojho účtu Beancount na správu finančných kníh a účtovných záznamov.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Prihlásiť sa",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Odhlasovanie z vášho účtu Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Odhlásiť sa",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "Stránka, ktorú hľadáte, neexistuje. Mohla byť presunutá alebo odstránená.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Stránka sa nenašla",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Vytvorte nové heslo pre svoj účet Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Obnoviť Heslo",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Aktualizujte informácie profilu, jazykové preferencie a všeobecné nastavenia účtu.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Všeobecné Nastavenia",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Spravujte SSH kľúče pre bezpečný prístup k svojim knihám Beancount cez Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH Kľúče",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Nebezpečná zóna",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Spravujte deštruktívne akcie účtu ako trvalé odstránenie vášho účtu a všetkých údajov.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Vytvorte si bezplatný účet Beancount a začnite sledovať svoje financie s účtovníctvom v čistom texte.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Vytvoriť Účet",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Overte svoju emailovú adresu na dokončenie registrácie účtu Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Overiť Email",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Vitajte to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Vitajte",
    description: "Welcome page title",
  },
};

export default skSeo;
