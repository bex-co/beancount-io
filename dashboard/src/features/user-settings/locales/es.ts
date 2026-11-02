import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const esUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.es,
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
  "userSettings.createKey": {
    message: "Crear Clave",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Crear nueva clave SSH",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Añade una nueva clave pública SSH para acceder al repositorio Git.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
      "Pegue aquí su clave pública. Normalmente empieza por ssh-ed25519 o ssh-rsa; puede mostrarla con cat ~/.ssh/id_ed25519.pub. También se aceptan claves públicas PEM.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
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
  "userSettings.deferredStartAppStore": {
    message:
      "Tu plan de App Store termina el {date}. Este plan empieza entonces.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "Tu plan de Google Play termina el {date}. Este plan empieza entonces.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "Tu plan de App Store sigue hasta el {date} y este plan se cobra hoy.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Tu plan de Google Play sigue hasta el {date} y este plan se cobra hoy.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Facturado a través de Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Facturado a través de App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Facturado a través de Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Adminístralo en tu iPhone o iPad: Ajustes → tu nombre → Suscripciones.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Gestionar en Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Finaliza el {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Cambia a {plan} el {date}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.subscriptionStatus.active": {
    message: "Activa",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Prueba",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Pago vencido",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Impagada",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Incompleta",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Caducada",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Cancelada",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "En pausa",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Suscripción",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Suscripción cancelada exitosamente",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Suscripción actualizada correctamente",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "Sistema",
    description: "System theme option",
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
    message: "Tokens de IA",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens usados este mes",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens usados este mes (ilimitado)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "El uso no está disponible en este momento.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Plan actual",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Plan gratuito",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Empresa",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Uso",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Libros mayores",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} libros mayores",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Facturación",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Ilimitado",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/mes",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} tokens AI / mes",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Tokens de IA ilimitados",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Libros de contabilidad ilimitados",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} libros mayores",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} libro mayor",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_many": {
    message: "{formattedCount} libros mayores",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} libros mayores",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
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
    message: "Hasta {formattedCount} colaboradores por libro mayor",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Hasta {formattedCount} colaborador por libro mayor",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_many": {
    message: "Hasta {formattedCount} colaboradores por libro mayor",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Hasta {formattedCount} colaboradores por libro mayor",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
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
  "userSettings.yearly": {
    message: "Anual",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Ciclo de facturación",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Planes",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Cambiar a anual",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Cambiar a mensual",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Bajar de plan",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Contáctanos",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} facturados anualmente",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Ahorra un {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Paga anualmente: {yearly} al año en lugar de {monthlyTotal}, y ahorra {saving} cada año.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/año",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Precio anterior",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Confirmando tu pago…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Ya tienes {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Se renueva el {date} por {amount}. Recibirás el recibo por correo electrónico.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Ahora incluye: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Pago recibido. Tu plan aparecerá en un minuto; actualiza para comprobarlo.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Actualizar",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Volver a donde estabas",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Empieza a usar {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Se canceló el pago. No se ha cobrado nada.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Ver facturación",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Cambiar a {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Calculando cuánto cuesta este cambio…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message:
      "No pudimos calcular el precio de este cambio. Inténtalo de nuevo.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Empieza hoy.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "A pagar hoy",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "Incluye un crédito de {credit} por el tiempo no usado de tu plan actual.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Después {amount}, con el próximo cobro el {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Se cobra a {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Qué obtienes",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Pagar {amount} y cambiar",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Continuar al pago",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Ahora no",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message: "El tiempo no usado siempre se descuenta: nunca pagas dos veces.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "Ya tienes este plan.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Mantienes este plan a un precio anterior y más bajo; cambiar solo lo subiría.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Tu cuenta tiene más de una suscripción activa. Contacta con soporte para cambiar de plan.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "No hay ninguna suscripción activa que cambiar. Actualiza la página para elegir un plan.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Tu último pago de renovación no se completó. Actualiza tu método de pago en Administrar facturación y después cambia de plan.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Empieza el {date}. Mantienes {plan} hasta entonces.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Hoy no pagas nada.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Qué cambia el {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Colaboradores por libro mayor",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "Tokens de IA al mes",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "tienes {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Todos tus libros mayores siguen siendo tuyos y funcionando. No podrás crear uno nuevo hasta que estés por debajo del nuevo límite de {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Programar bajada de plan",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Programar el cambio",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Mantener {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Programado para el {date}. Nada cambia hasta entonces.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Esto sustituye tu cambio programado a {plan} el {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "También retira tu cancelación, así que tu suscripción continúa.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Tu precio actual ya no se ofrece, así que termina con este cambio.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} con facturación mensual puede empezar en tu renovación del {date}. ¿Quieres {plan} hoy?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "Obtener {plan} hoy con facturación anual — {amount} ahora",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Cambiar a {plan} mensual el {date} — nada hoy",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Se aplica en tu renovación",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Ya no incluido",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Directivas",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Programado",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "Cambia a {plan} el {date}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} termina el {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Mantener el actual",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Tu plan se queda como está.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "No se pudo deshacer tu cambio programado. Inténtalo de nuevo.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "¿Cancelar {plan}?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "Mantienes {plan} hasta el {date}. Después pasas al plan gratuito: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Tus libros son texto plano: expórtalos cuando quieras. No se borra nada.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Otras opciones",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Cambiar a anual — {price}/mes",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Bajar a {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "¿Cuál es el motivo principal? (opcional)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Demasiado caro",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Falta una función",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "No lo uso",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Me cambio de herramienta",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Otro",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Tu banco tiene que aprobar este pago. No cambia nada hasta entonces; después de aprobarlo, actualiza esta página.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Esperando a que tu banco apruebe el pago…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Aprobar el pago",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "Tu banco no aprobó el pago. No ha cambiado nada.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Usar otra tarjeta",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Copias de seguridad automáticas",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Automatización e integraciones avanzadas",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Inicio de sesión único (SSO) con OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Consolidación de varias entidades",
    description: "Plan feature from the pricing table",
  },
};

export default esUserSettings;
