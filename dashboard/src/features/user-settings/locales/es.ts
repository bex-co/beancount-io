import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const esUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.es,
  "userSettings.accessUntil": {
    message: "Acceso hasta",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Cuenta eliminada exitosamente",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "Agregar Nueva Clave",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Agregada",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Todos los documentos y archivos adjuntos cargados",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Todos sus libros mayores e historial de transacciones",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Todas las preferencias y configuraciones",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Todas las transacciones y registros",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "Apariencia",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Cancelar suscripción",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "¿Está seguro de que desea cancelar su suscripción? Seguirá teniendo acceso hasta el final de su período de facturación actual.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "¿Cancelar suscripción?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Cancelando...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Esta acción no se puede deshacer.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Cambiar nombre",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Cambiar Nombre de Usuario",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Sí, cancelar suscripción",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Crear Clave",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Crear Nueva Clave API",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Agregue una nueva clave pública para autenticarse con la API de Beancount.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Crear Nueva Clave",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Creando...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Idioma",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "Personalice cómo se ve y se siente la aplicación",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Zona de Peligro",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Oscuro",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Eliminar cuenta",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Para confirmar, escriba su nombre de usuario "{username}" a continuación:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Introduzca su nombre de usuario",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Esta acción no se puede deshacer. Esto eliminará permanentemente su cuenta y eliminará todos sus datos de nuestros servidores.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "¿Eliminar Cuenta?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Eliminar permanentemente su cuenta y todos los datos asociados. Esta acción no se puede deshacer.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Eliminar Clave",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Eliminar Clave SSH",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "¿Está seguro de que desea eliminar la clave",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Eliminando...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Ingrese su nombre a continuación",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Ingrese su nuevo nombre de usuario a continuación",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Ingrese el nuevo nombre de usuario",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Error al crear la clave",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Error al cargar la configuración",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Error al cancelar la suscripción",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Reanudar suscripción",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "¿Reanudar la suscripción?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "¿Seguro que quieres reanudar tu suscripción? Tu suscripción seguirá renovándose automáticamente y se te volverá a cobrar al final del período de facturación actual.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Sí, reanudar la suscripción",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Reanudando...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Suscripción reanudada exitosamente",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Error al reanudar la suscripción",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Error al crear la sesión de pago. Por favor, inténtelo de nuevo.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Error al cargar las claves",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Hubo un error al cargar sus claves SSH. Por favor, inténtelo de nuevo.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Error al Cargar la Configuración",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Error al cargar el estado de la suscripción",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Nombre",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Lo siguiente se eliminará permanentemente:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "General",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "Invitar",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "Acciones irreversibles y destructivas",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Título de la Clave",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Un nombre descriptivo para esta clave que le ayude a identificarla más tarde.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "ej., Mi Clave de Desarrollo",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Apellidos",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Usada por última vez en los últimos 3 meses",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Usada por última vez en las últimas 3 semanas",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Usada por última vez hace más de 3 meses",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Usada por última vez en la última semana",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Claro",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Cargando la información de su cuenta...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Cargando información de sesión...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Cargando sus claves SSH...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Cargando detalles de suscripción...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Cargando preferencias de tema...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "Administrar su sesión activa",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Administrar facturación",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Administrar su suscripción y facturación",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Mensual",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Nombre",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Nunca usada",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Nueva clave SSH",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "Sin claves SSH",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Aún no ha creado ninguna clave SSH. Cree su primera clave para comenzar con el acceso seguro al repositorio.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "No establecido",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "Abriendo...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Clave Pública",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Pegue el contenido de su clave pública aquí. Debe comenzar con "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Se requiere la clave pública",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Se renueva el",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "Seleccione su tema de color preferido",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Seleccione su idioma preferido",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Sesión",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "Cerrar sesión de su cuenta y borrar su sesión.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "Claves SSH",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "Suscripción",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "La suscripción ha sido cancelada",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Suscripción cancelada exitosamente",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Suscripción actualizada correctamente",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Su pago requiere autenticación adicional. Por favor, revise su correo electrónico o contacte al emisor de su tarjeta.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "Sistema",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Modo de prueba",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "Tema",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Oscuro",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Claro",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Sistema",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "El título debe tener menos de 100 caracteres",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Se requiere el título",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "No se puede abrir el portal de facturación. Por favor, inténtelo de nuevo más tarde.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Plan Desconocido",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Perfil de Usuario",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Nombre de usuario actualizado con éxito",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Semanal",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Sí, Eliminar Mi Cuenta",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "La información de su cuenta",
    description: "Description for user profile section",
  },
  "userSettings.aiCfoUsage": {
    message: "AI Tokens",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens used this month",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens used this month (Unlimited)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.currentPlan": {
    message: "Current Plan",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Free Plan",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Enterprise",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Usage",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Ledgers",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} ledgers",
    description: "Ledger usage count display",
  },
  "userSettings.upgradeYourPlan": {
    message: "Upgrade Your Plan",
    description: "Section header for upgrade tier cards",
  },
  "userSettings.billing": {
    message: "Billing",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Unlimited",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/month",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} tokens AI / mes",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedLedgers": {
    message: "Libros de contabilidad ilimitados",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{count} libro mayor(es)",
    description: "Ledger allowance for a subscription tier",
  },
  "userSettings.unlimitedDirectives": {
    message: "Directivas ilimitadas",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} directivas",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Colaboradores ilimitados",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Hasta {count} colaboradores por libro mayor",
    description: "Collaborator allowance for each ledger",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Estás usando el {percentage}% de tus tokens AI mensuales. Actualiza para evitar interrupciones.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "huella digital",
    description: "Label for an SSH key fingerprint",
  },
};

export default esUserSettings;
