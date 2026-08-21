export interface TranslationEntry {
  message: string;
  description: string;
}

const nlSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Voltooien van uw inloggen bij Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Inloggen",
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
      "Uw Beancount-dashboard. Open uw grootboeken en beheer uw financiële gegevens.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Dashboard",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "Er is een fout opgetreden bij het laden van deze pagina. Probeer het opnieuw of keer terug naar de startpagina.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Fout",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Reset uw Beancount-accountwachtwoord door uw e-mailadres in te voeren.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Wachtwoord Vergeten",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Professionele platte-tekst boekhouding met Beancount. Volg financiën, beheer grootboeken en genereer rapporten met krachtige, precieze, controleerbare boekhouding.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Platte-Tekst Boekhouding",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Accountdetails en transactiegeschiedenis voor {accountName} in {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Stel vragen over de financiële gegevens van {ledgerName} met AI. Analyseer transacties, verken rekeningsaldi, begrijp trends en krijg directe boekhoudkundige inzichten.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Vraag over {ledgerName} - AI financieel assistent",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Balansrapport voor {ledgerName}. Bekijk activa, passiva en eigen vermogen in één oogopslag.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Balans - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Goederenlijst en prijzen voor {ledgerName}. Volg valuta, aandelen en andere activa.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Goederen - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Bekijk de commit-geschiedenis en versiebeheer voor {ledgerName}. Volg wijzigingen aan uw boekhoudsbestanden.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Commits - {ledgerName}",
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
      "Bekijk en beheer al uw Beancount-grootboeken. Maak nieuwe grootboeken, open bestaande en organiseer uw financiële gegevens.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Mijn Grootboeken",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Documentbijlagen en bonnen voor {ledgerName}. Organiseer ondersteunende bestanden voor uw transacties.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Documenten - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Validatiefouten en waarschuwingen voor {ledgerName}. Controleer en los problemen in uw grootboek op.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Fouten - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Gebeurtenistijdlijn voor {ledgerName}. Volg belangrijke financiële gebeurtenissen en mijlpalen.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Gebeurtenissen - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Blader door de Beancount-boekhoudbestanden voor {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Bestanden - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Maak een nieuw bestand in {ledgerName}. Voeg accounts, transacties of andere Beancount-invoer toe.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Bestand Aanmaken - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Upload bestanden naar {ledgerName}. Importeer bestaande Beancount-bestanden of -documenten.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Bestanden Uploaden - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Blader door publieke Beancount-grootboekvoorbeelden en sjablonen. Vind inspiratie voor uw eigen financiële tracking-setup.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Grootboek Galerij",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Beleggingsbezittingen en portfolio voor {ledgerName}. Bekijk huidige posities en waarderingen.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Bezittingen - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Importeer transacties naar {ledgerName} vanuit CSV, PDF, OFX of afbeeldingen. AI-analyse voor bankafschriften en bonnetjes.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Slim importeren - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Resultatenrekeningrapport voor {ledgerName}. Volg omzet, kosten en netto-inkomsten in de tijd.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Resultatenrekening - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Transactiejournaal voor {ledgerName}. Bekijk, zoek en filter al uw boekhoudgegevens.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Journaal - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Financieel overzicht en rapporten voor {ledgerName}. Bekijk netto vermogen, inkomsten, uitgaven en activaspreiding.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Overzicht - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Controleer pull request-wijzigingen voor {ledgerName}. Keur voorgestelde aanpassingen aan uw grootboek goed of wijs ze af.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Verbind bankrekeningen met {ledgerName} via Plaid. Importeer automatisch transacties en synchroniseer financiële gegevens.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Verbonden accounts - {ledgerName}",
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
      "Bevraag {ledgerName} met BQL-syntax. Voer aangepaste queries uit en analyseer uw financiële gegevens.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL Query - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Configureer grootboekinstellingen voor {ledgerName}. Beheer grootboekvoorkeuren, toegang en opties.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Grootboekinstellingen - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Statistische analyse voor {ledgerName}. Bekijk metrieken, trends en inzichten uit uw financiële gegevens.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Statistieken - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Proefbalansrapport voor {ledgerName}. Verifieer de gelijkheid van debiteringen en crediteringen in uw accounts.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Proefbalans - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Log in op uw Beancount-account om uw financiële grootboeken en boekhoudgegevens te beheren.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Inloggen",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Uitloggen bij uw Beancount-account.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Uitloggen",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "De pagina die u zoekt bestaat niet. Deze is mogelijk verplaatst of verwijderd.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Pagina niet gevonden",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Maak een nieuw wachtwoord voor uw Beancount-account.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Wachtwoord Resetten",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Update uw profielinformatie, taalvoorkeuren en algemene accountinstellingen.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Algemene Instellingen",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Beheer SSH-sleutels voor veilige toegang tot uw Beancount-grootboeken via Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH-sleutels",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Gevarenzone",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Beheer destructieve accountacties zoals het permanent verwijderen van uw account en alle gegevens.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Maak uw gratis Beancount-account aan om uw financiën te volgen met platte-tekst boekhouding.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Account Aanmaken",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Verifieer uw e-mailadres om de registratie van uw Beancount-account te voltooien.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "E-mail Verifiëren",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Welkom to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Welkom",
    description: "Welcome page title",
  },
};

export default nlSeo;
