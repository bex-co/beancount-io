export interface TranslationEntry {
  message: string;
  description: string;
}

const esDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Crear Libro Mayor",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Crear Nuevo Libro Mayor",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Cree un nuevo libro mayor de Beancount para comenzar a administrar sus finanzas.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Panel",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Ir al panel",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Eliminar libro",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      '¿Está seguro de que desea eliminar "{name}"? Esta acción no se puede deshacer.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Eliminando...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Descripción (Opcional)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Editar libro",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Editar configuración del libro",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Ingrese la descripción",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Ingrese el nombre del libro mayor",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Error al cargar el libro mayors",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Error al cargar el feed",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Libro mayor creado exitosamente",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Libro mayor eliminado exitosamente",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Ha alcanzado su límite de libros. Actualice para crear más libros.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Nombre del Libro Mayor",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Configuración de {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Libro mayor actualizado exitosamente",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Cargando libros mayores...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Administre sus libros mayores de Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Usa al menos una letra latina (A–Z) o un dígito: el nombre se convierte en la dirección web del libro.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "El nombre debe tener menos de 100 caracteres",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Nombre is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Libro personal",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "Registre una compra y entienda su efecto en el dinero restante.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Libro de autónomo",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Registre ingresos de clientes o vea lo que un cliente impago aún debe.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Libro de empresa",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Establezca una posición inicial y distinga financiación de ingresos.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Libro de cartera",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Registre una compra y verifique unidades, registros de adquisición y movimiento de efectivo.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Libro de alquiler",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message:
      "Registre recibos y distinga el alquiler de un depósito reembolsable.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Libro de gastos compartidos",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Registre un anticipo y vea quién debe a quién.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Libro de comunidad",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Explique contribuciones, gastos de proyectos y fondos restantes.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Libro en blanco",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Añada una estructura elegida sin eliminar categorías no deseadas.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Ingrese un monto como 100 o -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Moneda de operación",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Los libros comienzan el",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Cuenta de apertura",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Saldo inicial (opcional)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Decidir más tarde",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Revisar",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message:
      "Esto es exactamente lo que se creará. Vuelva atrás para cambiar algo.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Cuentas",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Paso {step} de {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "No se encontraron libros mayores",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "Cree su primer libro mayor para comenzar a hacer un seguimiento de sus finanzas.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Privado",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Solo usted y los colaboradores pueden acceder",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Público",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Cualquiera con el enlace puede ver sus datos financieros",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Nombre del repositorio",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Reintentar",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Buscar libros mayores...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Seleccione un libro mayor",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — cambiar de libro mayor",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Mostrar Más",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Actualice los detalles de su libro mayor.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Sus Libros Mayores",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Ir a la cuenta de {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Actividad",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Los cambios en tus libros aparecen aquí.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Cambios en todos los libros que puedes ver",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "No se pudo actualizar la actividad. Se muestra la que se cargó antes.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default esDashboardPage;
