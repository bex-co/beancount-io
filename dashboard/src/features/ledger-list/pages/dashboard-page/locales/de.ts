export interface TranslationEntry {
  message: string;
  description: string;
}

const deDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Hauptbuch erstellen",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Neues Hauptbuch erstellen",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Erstellen Sie ein neues Beancount-Hauptbuch, um mit der Verwaltung Ihrer Finanzen zu beginnen.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Dashboard",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Zum Dashboard",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Hauptbuch löschen",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Sind Sie sicher, dass Sie "{name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Wird gelöscht...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Beschreibung (Optional)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Hauptbuch bearbeiten",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Hauptbuch-Einstellungen bearbeiten",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Beschreibung eingeben",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Hauptbuchname eingeben",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Laden des Hauptbuchs fehlgeschlagens",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Fehler beim Laden des Feeds",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Hauptbuch erfolgreich erstellt",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Hauptbuch erfolgreich gelöscht",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Sie haben Ihr Hauptbuch-Limit erreicht. Upgraden Sie, um weitere Hauptbücher zu erstellen.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Hauptbuchname",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Einstellungen für {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Hauptbuch erfolgreich aktualisiert",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Hauptbücher werden geladen...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Verwalten Sie Ihre Beancount-Hauptbücher",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Verwenden Sie mindestens einen lateinischen Buchstaben (A–Z) oder eine Ziffer: Der Name wird zur Webadresse des Buches.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Der Name muss weniger als 100 Zeichen lang sein",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Name ist erforderlich",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Persönliches Buch",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message:
      "Erfassen Sie einen Kauf und verstehen Sie seine Wirkung auf Ihr Guthaben.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Freiberufler-Buch",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Erfassen Sie Kundeneinnahmen oder sehen Sie, was ein unbezahlter Kunde noch schuldet.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Geschäftsbuch",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Richten Sie eine Eröffnungsposition ein und unterscheiden Sie Finanzierung von Umsatz.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Portfolio-Buch",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Erfassen Sie einen Kauf und prüfen Sie Stückzahlen, Anschaffungsnachweise und Geldbewegung.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Mietbuch",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message:
      "Erfassen Sie Einnahmen und unterscheiden Sie Miete von einer rückzahlbaren Kaution.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Buch für gemeinsame Ausgaben",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Erfassen Sie einen Vorschuss und sehen Sie, wer wem schuldet.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Gemeinschaftsbuch",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Erklären Sie Beiträge, Projektausgaben und verbleibende Mittel.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Leeres Buch",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Fügen Sie eine gewählte Struktur hinzu, ohne unerwünschte Kategorien zu entfernen.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Geben Sie einen Betrag wie 100 oder -30.50 ein",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Betriebswährung",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Bücher beginnen am",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Eröffnungskonto",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Eröffnungssaldo (optional)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Später entscheiden",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Überprüfen",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "Genau das wird erstellt. Gehen Sie zurück, um etwas zu ändern.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Konten",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Schritt {step} von {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Keine Hauptbücher gefunden",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "Erstellen Sie Ihr erstes Hauptbuch, um Ihre Finanzen zu verfolgen.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Privat",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Nur Sie und Mitarbeiter haben Zugriff",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Öffentlich",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Jeder mit dem Link kann Ihre Finanzdaten einsehen",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Repository-Name",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Erneut versuchen",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Hauptbücher durchsuchen...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Hauptbuch auswählen",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — Hauptbuch wechseln",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Mehr Anzeigen",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Aktualisieren Sie die Details Ihres Hauptbuchs.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Ihre Hauptbücher",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Gehe zum Konto von {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Aktivität",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Änderungen an deinen Büchern erscheinen hier.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Änderungen in allen Büchern, die du sehen kannst",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "Aktivität konnte nicht aktualisiert werden. Angezeigt wird der zuvor geladene Stand.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default deDashboardPage;
