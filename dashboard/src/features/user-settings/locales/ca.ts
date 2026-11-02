import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const caUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.ca,
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
    message: "Cancel·la la subscripció",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "S'està cancel·lant...",
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
  "userSettings.createKey": {
    message: "Crear clau",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Crea una clau SSH nova",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Afegeix una clau pública SSH nova per a l’accés al repositori Git.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
    message: "Idioma",
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
    message: "Suprimeix el compte",
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
    message: "No s'ha pogut cancel·lar la subscripció",
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
    message: "No s'ha pogut crear la sessió de pagament. Torneu-ho a provar.",
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
    message: "Convida",
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
    message: "Gestiona la facturació",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Gestiona la teva subscripció i facturació",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Mensual",
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
    message: "S'està obrint...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Clau pública",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "Enganxeu aquí la vostra clau pública. Normalment comença per ssh-ed25519 o ssh-rsa; la podeu mostrar amb cat ~/.ssh/id_ed25519.pub. També s’accepten claus públiques PEM.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "La clau pública és obligatòria",
    description: "Validation error for missing public key",
  },
  "userSettings.startsOn": {
    message: "Comença el",
    description: "Label for when a deferred Stripe plan starts",
  },
  "userSettings.renewsOn": {
    message: "Es renova el",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message:
      "El teu pla de l’App Store acaba el {date}. Aquest pla comença llavors.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "El teu pla de Google Play acaba el {date}. Aquest pla comença llavors.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "El teu pla de l’App Store continua fins al {date}, i aquest pla es cobra avui.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "El teu pla de Google Play continua fins al {date}, i aquest pla es cobra avui.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Facturat a través de Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Facturat a través de l’App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Facturat a través de Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Gestiona-ho al teu iPhone o iPad: Configuració → el teu nom → Subscripcions.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Gestiona a Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Acaba el {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Canvia a {plan} el {date}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.subscriptionStatus.active": {
    message: "Actiu",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Comença més tard",
    description:
      "Billing badge for a Stripe subscription waiting for a store plan to end before its first charge (ADR 001 D15). No plan is sold with a trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Pagament endarrerit",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Impagat",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Incomplet",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Caducat",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Cancel·lat",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "En pausa",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Subscripció",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "La subscripció s'ha cancel·lat correctament",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Subscripció actualitzada correctament",
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
    message:
      "No s'ha pogut obrir el portal de facturació. Torneu-ho a provar més tard.",
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
    message: "Setmanal",
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
    message: "Tokens d'IA",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens utilitzats aquest mes",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens utilitzats aquest mes (il·limitat)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "L'ús no està disponible ara mateix.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Pla actual",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Pla gratuït",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Empresa",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Ús",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Llibres",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} llibres",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Facturació",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Il·limitat",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/mes",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} fitxes d'IA/mes",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Fitxes d'IA il·limitades",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Llibres il·limitats",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} llibres majors",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} llibre major",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_many": {
    message: "{formattedCount} llibres majors",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} llibres majors",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
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
    message: "Fins a {formattedCount} col·laboradors per llibre major",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Fins a {formattedCount} col·laborador per llibre major",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_many": {
    message: "Fins a {formattedCount} col·laboradors per llibre major",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Fins a {formattedCount} col·laboradors per llibre major",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
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
  "userSettings.yearly": {
    message: "Anual",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Cicle de facturació",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Plans",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Canvia a anual",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Canvia a mensual",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Baixa de pla",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Contacta'ns",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} facturats anualment",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Estalvia un {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Paga anualment: {yearly} l'any en lloc de {monthlyTotal}, i estalvia {saving} cada any.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/any",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Preu antic",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Confirmant el pagament…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Ara teniu {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Es renova el {date} per {amount}. Rebreu el rebut per correu electrònic.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Ara inclou: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Pagament rebut. El vostre pla apareixerà d'aquí a un minut; actualitzeu per comprovar-ho.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Actualitza",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Torna on éreu",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Comença a fer servir {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "S'ha cancel·lat el pagament. No s'ha cobrat res.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Mostra la facturació",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Canvia a {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Calculant quant costa aquest canvi…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message:
      "No hem pogut calcular el preu d'aquest canvi. Torneu-ho a provar.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Comença avui.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "A pagar avui",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "Inclou un crèdit de {credit} pel temps no utilitzat del pla actual.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Després {amount}, el proper cobrament el {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Es carrega a {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Què hi guanyeu",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Paga {amount} i canvia",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Continua al pagament",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Ara no",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "El temps no utilitzat sempre es descompta: mai no pagueu dues vegades.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "Ja teniu aquest pla.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Manteniu aquest pla a un preu antic i més baix; canviar-lo només l'apujaria.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "El vostre compte té més d'una subscripció activa. Contacteu amb el servei d'assistència per canviar de pla.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "No hi ha cap subscripció activa per canviar. Actualitza la pàgina per triar un pla.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "L'últim pagament de renovació no s'ha completat. Actualitza el mètode de pagament a Gestiona la facturació i després canvia de pla.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Comença el {date}. Conserves {plan} fins aleshores.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Avui no has de pagar res.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Què canvia el {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Col·laboradors per llibre major",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "Tokens d'IA al mes",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "en tens {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Tots els teus llibres segueixen sent teus i funcionant. No en podràs crear un de nou fins que estiguis per sota del nou límit de {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Programa la baixada de pla",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Programa el canvi",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Mantén {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Programat per al {date}. No canvia res fins aleshores.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Això substitueix el canvi programat a {plan} del {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "També retira la cancel·lació, així que la subscripció continua.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "El teu preu actual ja no s'ofereix, així que s'acaba amb aquest canvi.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} amb facturació mensual pot començar a la renovació del {date}. Vols {plan} avui?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "Obtén {plan} avui amb facturació anual — {amount} ara",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Canvia a {plan} mensual el {date} — res avui",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Entra en vigor a la renovació",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Ja no s'inclou",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Directives",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Programat",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "Canvia a {plan} el {date}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} acaba el {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Mantén l'actual",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "El teu pla es queda com està.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "No s'ha pogut desfer el canvi programat. Torna-ho a provar.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "Vols cancel·lar {plan}?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "Conserves {plan} fins al {date}. Després passes al pla gratuït: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Els teus llibres són text pla: exporta'ls quan vulguis. No s'esborra res.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Altres opcions",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Canvia a anual — {price}/mes",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Baixa a {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Quin és el motiu principal? (opcional)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Massa car",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Hi falta una funció",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "No el faig servir",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Canvio d'eina",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Un altre",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "El vostre banc ha d'aprovar aquest pagament. No canvia res fins aleshores; després d'aprovar-lo, actualitzeu aquesta pàgina.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "S'està esperant que el vostre banc aprovi el pagament…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Aprova el pagament",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "El vostre banc no ha aprovat el pagament. No ha canviat res.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Fes servir una altra targeta",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Còpies de seguretat automàtiques",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Automatització i integracions avançades",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Inici de sessió únic (SSO) amb OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Consolidació de diverses entitats",
    description: "Plan feature from the pricing table",
  },
};

export default caUserSettings;
