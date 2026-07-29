export interface TranslationEntry {
  message: string;
  description: string;
}

const deSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Abschluss Ihrer Anmeldung bei Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Anmeldung läuft",
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
      "Ihr Beancount-Dashboard. Greifen Sie auf Ihre Hauptbücher zu und verwalten Sie Ihre Finanzdaten.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Dashboard",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "Beim Laden dieser Seite ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kehren Sie zur Startseite zurück.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Fehler",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Setzen Sie Ihr Beancount-Kontopasswort zurück, indem Sie Ihre E-Mail-Adresse eingeben.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Passwort Vergessen",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Professionelle Klartextbuchhaltung mit Beancount. Verfolgen Sie Finanzen, verwalten Sie Hauptbücher und erstellen Sie Berichte mit leistungsstarker, präziser, prüfbarer Buchhaltung.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Klartextbuchhaltung",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Kontodetails und Transaktionsverlauf für {accountName} in {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Stellen Sie Fragen zu den Finanzdaten von {ledgerName} mit KI. Analysieren Sie Transaktionen, erkunden Sie Kontosalden, verstehen Sie Trends und erhalten Sie sofortige Buchhaltungseinblicke.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Fragen zu {ledgerName} - KI-Finanzassistent",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Bilanzbericht für {ledgerName}. Zeigen Sie Vermögenswerte, Verbindlichkeiten und Eigenkapital auf einen Blick an.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Bilanz - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCollaborators.description": {
    message:
      "Verwalten Sie Mitarbeiter für {ledgerName}. Laden Sie Benutzer ein und steuern Sie Zugriffsberechtigungen.",
    description: "Collaborators page meta description",
  },
  "seo.ledgerCollaborators.title": {
    message: "Mitarbeiter - {ledgerName}",
    description: "Collaborators page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Warenliste und Preise für {ledgerName}. Verfolgen Sie Währungen, Aktien und andere Vermögenswerte.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Waren - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Commit-Verlauf und Versionskontrolle für {ledgerName} anzeigen. Änderungen an Ihren Buchhaltungsdateien verfolgen.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Commits - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerDashboard.description": {
    message:
      "Zeigen Sie alle Ihre Beancount-Hauptbücher an und verwalten Sie sie. Erstellen Sie neue Hauptbücher, greifen Sie auf bestehende zu und organisieren Sie Ihre Finanzunterlagen.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Meine Hauptbücher",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Dokumentanhänge und Belege für {ledgerName}. Organisieren Sie unterstützende Dateien für Ihre Transaktionen.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Dokumente - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Validierungsfehler und Warnungen für {ledgerName}. Überprüfen und beheben Sie Probleme in Ihrem Hauptbuch.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Fehler - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Ereigniszeitleiste für {ledgerName}. Verfolgen Sie wichtige finanzielle Ereignisse und Meilensteine.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Ereignisse - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message:
      "Bearbeiten Sie Hauptbuchdateien für {ledgerName}. Zeigen Sie Ihre Beancount-Buchhaltungsdateien an und ändern Sie sie.",
    description: "File editor page meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Dateien - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Erstellen Sie eine neue Datei in {ledgerName}. Fügen Sie Konten, Transaktionen oder andere Beancount-Einträge hinzu.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Datei Erstellen - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Laden Sie Dateien in {ledgerName} hoch. Importieren Sie vorhandene Beancount-Dateien oder -Dokumente.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Dateien Hochladen - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Durchsuchen Sie öffentliche Beancount-Hauptbuchbeispiele und -vorlagen. Finden Sie Inspiration für Ihre eigene Finanzverfolgung.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Hauptbuch-Galerie",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Anlagebestände und Portfolio für {ledgerName}. Zeigen Sie aktuelle Positionen und Bewertungen an.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Bestände - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Transaktionen in {ledgerName} aus CSV, PDF, OFX oder Bilddateien importieren. KI-gestützte Analyse für Kontoauszüge und Belege.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Intelligenter Import - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Gewinn- und Verlustrechnungsbericht für {ledgerName}. Verfolgen Sie Einnahmen, Ausgaben und Nettoertrag im Zeitverlauf.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Gewinn- und Verlustrechnung - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Transaktionsjournal für {ledgerName}. Zeigen Sie alle Ihre Buchungseinträge an, suchen und filtern Sie sie.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Journal - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Finanzüberblick und Berichte für {ledgerName}. Zeigen Sie Vermögen, Einkommen, Ausgaben und Vermögensverteilung an.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Übersicht - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Pull-Request-Änderungen für {ledgerName} überprüfen. Vorgeschlagene Änderungen an Ihrer Buchhaltung genehmigen oder ablehnen.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Verbinden Sie Bankkonten mit {ledgerName} über Plaid. Importieren Sie automatisch Transaktionen und synchronisieren Sie Finanzdaten.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Verbundene Konten - {ledgerName}",
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
      "Fragen Sie {ledgerName} mit BQL-Syntax ab. Führen Sie benutzerdefinierte Abfragen aus und analysieren Sie Ihre Finanzdaten.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL-Abfrage - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Konfigurieren Sie Hauptbuch-Einstellungen für {ledgerName}. Verwalten Sie Hauptbuchpräferenzen, Zugriff und Optionen.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Hauptbuch-Einstellungen - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Statistische Analyse für {ledgerName}. Zeigen Sie Metriken, Trends und Einblicke aus Ihren Finanzdaten an.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Statistiken - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Probebilanzbericht für {ledgerName}. Überprüfen Sie die Gleichheit von Soll und Haben in Ihren Konten.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Probebilanz - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Melden Sie sich bei Ihrem Beancount-Konto an, um Ihre Finanzbücher und Buchhaltungsunterlagen zu verwalten.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Anmelden",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Abmeldung von Ihrem Beancount-Konto.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Abmelden",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "Die gesuchte Seite existiert nicht. Sie wurde möglicherweise verschoben oder gelöscht.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Seite nicht gefunden",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Erstellen Sie ein neues Passwort für Ihr Beancount-Konto.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Passwort Zurücksetzen",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Aktualisieren Sie Ihre Profilinformationen, Spracheinstellungen und allgemeinen Kontoeinstellungen.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Allgemeine Einstellungen",
    description: "General settings page title",
  },
  "seo.settingsIndex.description": {
    message:
      "Verwalten Sie Ihre Beancount-Kontoeinstellungen, Präferenzen und Konfigurationen.",
    description: "Settings index page meta description",
  },
  "seo.settingsIndex.title": {
    message: "Kontoeinstellungen",
    description: "Settings index page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Verwalten Sie SSH-Schlüssel für sicheren Zugriff auf Ihre Beancount-Hauptbücher über Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH-Schlüssel",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Gefahrenzone",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Verwalten Sie destruktive Kontoaktionen wie das permanente Löschen Ihres Kontos und aller Daten.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Erstellen Sie Ihr kostenloses Beancount-Konto, um Ihre Finanzen mit Klartextbuchhaltung zu verfolgen.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Konto Erstellen",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Verifizieren Sie Ihre E-Mail-Adresse, um die Registrierung Ihres Beancount-Kontos abzuschließen.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "E-Mail Verifizieren",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Willkommen to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Willkommen",
    description: "Welcome page title",
  },
};

export default deSeo;
