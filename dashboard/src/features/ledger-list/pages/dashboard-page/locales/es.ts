export interface TranslationEntry {
  message: string;
  description: string;
}

const esDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Últimas Actualizaciones",
    description: "Title for blog feed section on dashboard",
  },
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
    message: "Eliminar Ledger",
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
    message: "Editar Ledger",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Editar Ledger Settings",
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
    message: "El nombre debe contener al menos una letra o número",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Nombre must be less than 100 characters",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Nombre is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.noFeedItems": {
    message: "No hay elementos en el feed",
    description: "Empty state message when no feed items exist",
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
    description: "Aria label for ledger switcher button",
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
};

export default esDashboardPage;
