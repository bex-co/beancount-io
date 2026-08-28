export interface TranslationEntry {
  message: string;
  description: string;
}

const deDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Neueste Updates",
    description: "Title for blog feed section on dashboard",
  },
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
    message: "Löschen Ledger",
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
    message: "Bearbeiten Ledger",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Bearbeiten Ledger Settings",
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
      "Sie haben Ihr Ledger-Limit erreicht. Upgraden Sie, um weitere Ledger zu erstellen.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Hauptbuchname",
    description: "Form label for ledger name field",
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
    message: "Name muss mindestens einen Buchstaben oder eine Zahl enthalten",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Name must be less than 100 characters",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Name is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.noFeedItems": {
    message: "Keine Feed-Einträge verfügbar",
    description: "Empty state message when no feed items exist",
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
    description: "Aria label for ledger switcher button",
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
};

export default deDashboardPage;
