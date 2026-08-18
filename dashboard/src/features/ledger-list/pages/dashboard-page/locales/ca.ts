export interface TranslationEntry {
  message: string;
  description: string;
}

const caDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Últimes Actualitzacions",
    description: "Title for blog feed section on dashboard",
  },
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
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "No s'han pogut recuperar els vostres llibres. Si us plau, comproveu la connexió i torneu-ho a intentar.",
    description: "Detailed error description for ledger loading failure",
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
  "page.dashboard.manageLedgersDescription": {
    message:
      "Gestiona els teus llibres de Beancount. Fes clic en un llibre per veure'n els detalls.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "El nom ha de contenir almenys una lletra o número",
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
  "page.dashboard.noFeedItems": {
    message: "No hi ha elements de feed disponibles",
    description: "Empty state message when no feed items exist",
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
    description: "Aria label for ledger switcher button",
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
};

export default caDashboardPage;
