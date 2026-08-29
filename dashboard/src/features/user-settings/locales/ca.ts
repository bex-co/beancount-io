import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const caUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.ca,
  "userSettings.accessUntil": {
    message: "Access until",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Compte eliminat correctament",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "Afegir clau nova",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Afegit",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Tots els documents i adjunts pujats",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Tots els vostres llibres i historial de transaccions",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Totes les preferències i configuracions",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Totes les transaccions i registres",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "Aparença",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Cancel Subscription",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Cancel Subscription?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Canceling...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Aquesta acció no es pot desfer.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Canviar nom",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Canviar nom d'usuari",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Yes, Cancel Subscription",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Crear clau",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Crear clau d'API nova",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Afegeix una clau pública nova per autenticar-te amb l'API de Beancount.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Crear clau nova",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Creant...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Language",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "Personalitza com es veu i se sent l'aplicació",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Zona perillosa",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Fosc",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Delete Account",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Per confirmar, escriviu el vostre nom d\'usuari "{username}" a continuació:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Introduïu el vostre nom d'usuari",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Aquesta acció no es pot desfer. Això eliminarà permanentment el vostre compte i eliminarà totes les vostres dades dels nostres servidors.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Eliminar compte?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Elimina permanentment el teu compte i totes les dades associades. Aquesta acció no es pot desfer.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Eliminar clau",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Eliminar clau SSH",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Esteu segur que voleu eliminar la clau",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Eliminant...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Introduïu el vostre nom a continuació",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Introduïu el vostre nom d'usuari nou a continuació",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Introduïu el nom d'usuari nou",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Error en crear la clau",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Error en carregar la configuració",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Failed to cancel subscription",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Reprendre subscripció",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "Voleu reprendre la subscripció?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Segur que voleu reprendre la subscripció? La subscripció es continuarà renovant automàticament i se us tornarà a cobrar al final del període de facturació actual.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Sí, reprèn la subscripció",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Reprenent...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Subscripció represa correctament",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Error en reprendre la subscripció",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Failed to create checkout session. Please try again.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Error en carregar les claus",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "S'ha produït un error en carregar les vostres claus SSH. Si us plau, torneu-ho a intentar.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Error en carregar la configuració",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Error en carregar l'estat de la subscripció",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Nom",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Els elements següents s'eliminaran permanentment:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "General",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "Invite",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "Accions irreversibles i destructives",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Títol de la clau",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Un nom descriptiu per a aquesta clau per ajudar-te a identificar-la més endavant.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "p. ex., La meva clau de desenvolupament",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Cognoms",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Utilitzada per última vegada en els últims 3 mesos",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Utilitzada per última vegada en les últimes 3 setmanes",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Utilitzada per última vegada fa més de 3 mesos",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Utilitzada per última vegada en l'última setmana",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Clar",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Carregant la informació del vostre compte...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Carregant la informació de la sessió...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Carregant les vostres claus SSH...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Carregant els detalls de la subscripció...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Carregant les preferències del tema...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "Gestiona la teva sessió activa",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Manage Billing",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Gestiona la teva subscripció i facturació",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Monthly",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Nom",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Mai utilitzada",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Clau SSH nova",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "Sense claus SSH",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Encara no heu creat cap clau SSH. Creeu la vostra primera clau per començar amb l'accés segur al repositori.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "No establert",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "Opening...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Clau pública",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Paste your public key content here. It should start with "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "La clau pública és obligatòria",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Renews on",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "Seleccioneu el vostre tema de color preferit",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Seleccioneu el vostre idioma preferit",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Sessió",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "Tanqueu la sessió del vostre compte i esborreu la vostra sessió.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "Claus SSH",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "Subscripció",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Subscription has been canceled",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Subscription canceled successfully",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Subscripció actualitzada correctament",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "El vostre pagament requereix autenticació addicional. Consulteu el vostre correu electrònic o l'emissor de la targeta.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "Sistema",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Test Mode",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "Theme",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Fosc",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Clar",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Sistema",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "El títol ha de tenir menys de 100 caràcters",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "El títol és obligatori",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "Unable to open billing portal. Please try again later.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Pla desconegut",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Perfil d'usuari",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Nom d'usuari actualitzat correctament",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Weekly",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Sí, eliminar el meu compte",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "La informació del vostre compte",
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
    message: "{count} fitxes d'IA/mes",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedLedgers": {
    message: "Llibres il·limitats",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{count} registre(s)",
    description: "Ledger allowance for a subscription tier",
  },
  "userSettings.unlimitedDirectives": {
    message: "Directives il·limitades",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} directives",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Col·laboradors il·limitats",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Fins a {count} col·laboradors per llibre major",
    description: "Collaborator allowance for each ledger",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Estàs utilitzant el {percentage}% dels teus fitxes d'IA mensuals. Actualitza per evitar interrupcions.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "empremta digital",
    description: "Label for an SSH key fingerprint",
  },
};

export default caUserSettings;
