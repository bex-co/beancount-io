export interface TranslationEntry {
  message: string;
  description: string;
}

const caDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Crear llibre",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Crear un llibre nou",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Crea un llibre de Beancount nou per començar a gestionar les teves finances.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Tauler",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Vés al tauler",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Eliminar llibre",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Esteu segur que voleu eliminar "{name}"? Aquesta acció no es pot desfer.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Eliminant...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Descripció (opcional)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Editar llibre",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Editar configuració del llibre",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Introduïu la descripció",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Introduïu el nom del llibre",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Error en carregar els llibres",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Error al carregar el feed",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Llibre creat correctament",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Llibre eliminat correctament",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Has arribat al teu límit de llibres. Actualitza per crear més llibres.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Nom del llibre",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Configuració de {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Llibre actualitzat correctament",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Carregant llibres...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Gestiona els teus llibres de Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Feu servir com a mínim una lletra llatina (A–Z) o un dígit: el nom es converteix en l'adreça web del llibre.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "El nom ha de tenir menys de 100 caràcters",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "El nom és obligatori",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Llibre personal",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message:
      "Registreu una compra i enteneu el seu efecte en els diners restants.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Llibre d'autònom",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Registreu ingressos de clients o vegeu què deu un client impagat.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Llibre d'empresa",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Establiu una posició inicial i distingiu finançament d'ingressos.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Llibre de cartera",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Registreu una compra i verifiqueu unitats, adquisicions i moviment d'efectiu.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Llibre de lloguer",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message:
      "Registreu rebuts i distingiu el lloguer d'un dipòsit reemborsable.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Llibre de despeses compartides",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Registreu una bestreta i vegeu qui deu a qui.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Llibre de comunitat",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Expliqueu contribucions, despeses de projectes i fons restants.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Llibre en blanc",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Afegiu una estructura triada sense eliminar categories no desitjades.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Introduïu un import com 100 o -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Moneda d'operació",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.currencyFromSaved": {
    message: "De la teva preferència desada",
    description:
      "Source label under the suggested currency: the account's saved preference (ADR026)",
  },
  "page.dashboard.currencyFromRegion": {
    message: "De la regió del teu navegador",
    description:
      "Source label under the suggested currency: the browser region (ADR026)",
  },
  "page.dashboard.currencyUseTimeZone": {
    message: "Utilitza {currency} (de la teva zona horària)",
    description:
      "One-tap button offering the browser time zone's currency when it differs from the suggestion (ADR026)",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Compte d'obertura",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Saldo inicial (opcional)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Decidir més tard",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Comptes",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupPurposeNote": {
    message:
      "Una empresa, un club o diners compartits amb altres persones tenen el seu propi llibre.",
    description:
      "Note beside the purpose choice in ledger creation: other entities get their own ledger",
  },
  "page.dashboard.setupModules": {
    message: "Fes-ne també el seguiment en aquest llibre",
    description:
      "Heading of the personal-only module list in ledger creation (PRFAQ001 A.9)",
  },
  "page.dashboard.moduleInvestments": {
    message: "Inversions",
    description: "Name of the investments module",
  },
  "page.dashboard.moduleInvestmentsOutcome": {
    message: "Actius de corretatge, dividends, interessos i guanys.",
    description: "One-line outcome of the investments module",
  },
  "page.dashboard.moduleRentalProperty": {
    message: "Un immoble de lloguer",
    description: "Name of the rental-property module",
  },
  "page.dashboard.moduleRentalPropertyOutcome": {
    message: "Lloguer, dipòsits i despeses d’un immoble.",
    description: "One-line outcome of the rental-property module",
  },
  "page.dashboard.moduleSideBusiness": {
    message: "Una activitat paral·lela",
    description: "Name of the side-business module",
  },
  "page.dashboard.moduleSideBusinessOutcome": {
    message:
      "Ingressos de clients i despeses del negoci, amb un compte bancari del negoci separat.",
    description: "One-line outcome of the side-business module",
  },
  "page.dashboard.setupPropertyName": {
    message: "Nom de l’immoble",
    description: "Label for the rental property's account name",
  },
  "page.dashboard.setupPropertyNameHint": {
    message: "S’utilitza als noms dels comptes, per exemple {example}.",
    description:
      "Hint under the rental property name field - interpolation: {example} (an example account name)",
  },
  "page.dashboard.setupPropertyNameInvalid": {
    message:
      "Comença amb una majúscula o un dígit i fes servir només lletres, dígits i guions (fins a 64).",
    description: "Validation message for an invalid rental property name",
  },
  "page.dashboard.setupBalanceAsOf": {
    message: "Saldo a data de",
    description:
      "Label for the date of a known opening balance, which starts the books",
  },
  "page.dashboard.setupSummaryAccounts": {
    message: "{count} comptes",
    description:
      "Account count in the summary beside Create ledger - interpolation: {count} (base key for pluralization)",
  },
  "page.dashboard.setupSummaryAccounts_one": {
    message: "{count} compte",
    description:
      "Account count in the summary beside Create ledger - interpolation: {count} - one form",
  },
  "page.dashboard.setupSummaryAccounts_many": {
    message: "{count} comptes",
    description:
      "Account count in the summary beside Create ledger - interpolation: {count} - many form",
  },
  "page.dashboard.setupSummaryAccounts_other": {
    message: "{count} comptes",
    description:
      "Account count in the summary beside Create ledger - interpolation: {count} - other form",
  },
  "page.dashboard.setupStep": {
    message: "Pas {step} de {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "No s'han trobat llibres",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "Crea el teu primer llibre per començar a fer un seguiment de les teves finances.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Privat",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Només tu i els col·laboradors poden accedir",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Públic",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message:
      "Qualsevol persona amb l'enllaç pot veure les vostres dades financeres",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Nom del repositori",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Tornar a intentar",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Cercar llibres...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Seleccionar un llibre",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — canviar de llibre",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Mostrar Més",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Actualitza els detalls del teu llibre.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Els teus llibres",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Anar al compte de {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Activitat",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Els canvis als teus llibres apareixen aquí.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Canvis a tots els llibres que pots veure",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "No s'ha pogut actualitzar l'activitat. Es mostra la que s'havia carregat abans.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default caDashboardPage;
