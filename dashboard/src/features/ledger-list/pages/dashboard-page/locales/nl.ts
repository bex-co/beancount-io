export interface TranslationEntry {
  message: string;
  description: string;
}

const nlDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Laatste Updates",
    description: "Title for blog feed section on dashboard",
  },
  "page.dashboard.createLedger": {
    message: "Grootboek aanmaken",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Nieuw grootboek aanmaken",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Maak een nieuw Beancount grootboek aan om uw financiën te beheren.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Dashboard",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.deleteLedger": {
    message: "Grootboek verwijderen",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Weet u zeker dat u "{name}" wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Verwijderen...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Beschrijving (Optioneel)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Grootboek bewerken",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Grootboekinstellingen bewerken",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Voer beschrijving in",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Voer grootboeknaam in",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Laden van grootboek mislukts",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "We konden uw grootboeken niet ophalen. Controleer uw verbinding en probeer het opnieuw.",
    description: "Detailed error description for ledger loading failure",
  },
  "page.dashboard.feedError": {
    message: "Kan feed niet laden",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Grootboek succesvol aangemaakt",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Grootboek succesvol verwijderd",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "U heeft uw grootboeklimiet bereikt. Upgrade om meer grootboeken te maken.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Grootboeknaam",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Grootboek succesvol bijgewerkt",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Grootboeken laden...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Beheer uw Beancount grootboeken",
    description: "Description of ledger management",
  },
  "page.dashboard.manageLedgersDescription": {
    message:
      "Beheer uw Beancount grootboeken. Klik op een grootboek om de details te bekijken.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "Naam moet minimaal één letter of cijfer bevatten",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Naam must be less than 100 characters",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Naam is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.noFeedItems": {
    message: "Geen feed-items beschikbaar",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "Geen grootboeken gevonden",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.private": {
    message: "Privé",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Alleen u en medewerkers hebben toegang",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Openbaar",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Iedereen met de link kan uw financiële gegevens bekijken",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Repository naam",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Opnieuw proberen",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Grootboeken zoeken...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Selecteer een grootboek",
    description: "Aria label for ledger switcher button",
  },
  "page.dashboard.showMore": {
    message: "Toon Meer",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Werk de details van uw grootboek bij.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Uw grootboeken",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Ga naar het account van {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
};

export default nlDashboardPage;
