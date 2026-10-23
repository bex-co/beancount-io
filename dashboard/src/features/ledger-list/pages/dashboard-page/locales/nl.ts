export interface TranslationEntry {
  message: string;
  description: string;
}

const nlDashboardPage: Record<string, TranslationEntry> = {
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
  "page.dashboard.goToDashboard": {
    message: "Naar het dashboard",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
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
  "page.dashboard.ledgerSettingsFor": {
    message: "Instellingen voor {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
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
  "page.dashboard.nameInvalid": {
    message:
      "Gebruik minstens één Latijnse letter (A–Z) of cijfer: de naam wordt het webadres van het grootboek.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "De naam moet minder dan 100 tekens bevatten",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Naam is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Persoonlijk grootboek",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message:
      "Leg een aankoop vast en begrijp het effect op uw resterende geld.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Freelance grootboek",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Leg klantinkomsten vast of zie wat een onbetaalde klant nog schuldig is.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Zakelijk grootboek",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Bepaal een openingspositie en onderscheid financiering van omzet.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Portefeuille grootboek",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Leg een aankoop vast en controleer eenheden, aanschafgegevens en geldstroom.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Verhuur grootboek",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message:
      "Leg ontvangsten vast en onderscheid huur van een terugbetaalbare borg.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Grootboek voor gedeelde uitgaven",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Leg een voorschot vast en zie wie aan wie schuldig is.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Gemeenschaps grootboek",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Verklaar bijdragen, projectuitgaven en resterende fondsen.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Leeg grootboek",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Voeg een gekozen structuur toe zonder ongewenste categorieën te verwijderen.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Voer een bedrag in zoals 100 of -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Operationele valuta",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Boeken beginnen op",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Openingsrekening",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Openingssaldo (optioneel)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Later beslissen",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Controleren",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message:
      "Dit is precies wat er wordt gemaakt. Ga terug om iets te wijzigen.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Rekeningen",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Stap {step} van {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Geen grootboeken gevonden",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message: "Maak uw eerste grootboek aan om uw financiën bij te houden.",
    description:
      "Empty state description prompting the user to create their first ledger",
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
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — van grootboek wisselen",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
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
  "page.dashboard.activity": {
    message: "Activiteit",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Wijzigingen aan je grootboeken verschijnen hier.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Wijzigingen in alle grootboeken die je kunt zien",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "Activiteit kon niet worden vernieuwd. Eerder geladen activiteit wordt getoond.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default nlDashboardPage;
