import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const frUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.fr,
  "userSettings.accountDeleted": {
    message: "Compte supprimé avec succès",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "Ajouter une nouvelle clé",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Ajoutée",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Tous les documents et pièces jointes téléversés",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Tous vos grands livres et historique des transactions",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Toutes les préférences et paramètres",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Toutes les transactions et enregistrements",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "Apparence",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Annuler l'abonnement",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "Annulation...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Cette action ne peut pas être annulée.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Changer le nom",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Modifier le nom d'utilisateur",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "Créer une clé",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Créer une nouvelle clé SSH",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Ajoutez une nouvelle clé publique SSH pour l’accès au dépôt Git.",
    description:
      "Dialog description for creating an SSH public key for Git access",
  },
  "userSettings.createNewKey": {
    message: "Créer une nouvelle clé",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Création en cours...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Langue",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "Personnaliser l'apparence de l'application",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Zone de danger",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Sombre",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Supprimer le compte",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Pour confirmer, saisissez votre nom d\'utilisateur "{username}" ci-dessous :',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Saisissez votre nom d'utilisateur",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Cette action ne peut pas être annulée. Ceci supprimera définitivement votre compte et retirera toutes vos données de nos serveurs.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Supprimer le compte ?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Supprimer définitivement votre compte et toutes les données associées. Cette action ne peut pas être annulée.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Supprimer la clé",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Supprimer la clé SSH",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Êtes-vous sûr de vouloir supprimer la clé",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Suppression en cours...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Entrez votre nom ci-dessous",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Saisissez votre nouveau nom d'utilisateur ci-dessous",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Saisissez le nouveau nom d'utilisateur",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Erreur lors de la création de la clé",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Erreur lors du chargement des paramètres",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Échec de l'annulation de l'abonnement",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Reprendre l'abonnement",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "Reprendre l’abonnement ?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Voulez-vous vraiment reprendre votre abonnement ? Il continuera à se renouveler automatiquement et vous serez de nouveau facturé à la fin de la période de facturation en cours.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Oui, reprendre l’abonnement",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Reprise...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Abonnement repris avec succès",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Échec de la reprise de l'abonnement",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message:
      "Échec de la création de la session de paiement. Veuillez réessayer.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Échec du chargement des clés",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Une erreur s'est produite lors du chargement de vos clés SSH. Veuillez réessayer.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Échec du chargement des paramètres",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Échec du chargement de l'état de l'abonnement",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Prénom",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Les éléments suivants seront supprimés définitivement :",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Général",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "Inviter",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "Actions irréversibles et destructrices",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Titre de la clé",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Un nom descriptif pour cette clé pour vous aider à l'identifier plus tard.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "ex: Ma clé de développement",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Nom de famille",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Dernière utilisation il y a moins de 3 mois",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Dernière utilisation il y a moins de 3 semaines",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Dernière utilisation il y a plus de 3 mois",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Dernière utilisation il y a moins d'une semaine",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Clair",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Chargement de vos informations de compte...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Chargement des informations de session...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Chargement de vos clés SSH...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Chargement des détails de l'abonnement...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Chargement des préférences de thème...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "Gérer votre session active",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Gérer la facturation",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Gérer votre abonnement et facturation",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Mensuel",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Nom",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Jamais utilisée",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Nouvelle clé SSH",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "Aucune clé SSH",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Vous n'avez pas encore créé de clés SSH. Créez votre première clé pour commencer avec un accès sécurisé au dépôt.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Non défini",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "Ouverture...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Clé publique",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "Collez votre clé publique ici. Elle commence généralement par ssh-ed25519 ou ssh-rsa ; affichez-la avec cat ~/.ssh/id_ed25519.pub. Les clés publiques PEM sont également acceptées.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "La clé publique est requise",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Renouvelle le",
    description: "Label for subscription renewal date",
  },
  "userSettings.billedByStripe": {
    message: "Facturé via Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Facturé via l’App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Facturé via Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Gérez-le sur votre iPhone ou iPad : Réglages → votre nom → Abonnements.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Gérer sur Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Prend fin le {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Passe à {plan} le {date}",
    description: "Plan card: a store plan with a scheduled change",
  },
  "userSettings.selectColorTheme": {
    message: "Sélectionnez votre thème de couleur préféré",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Sélectionnez votre langue préférée",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Session",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "Déconnectez-vous de votre compte et effacez votre session.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "Clés SSH",
    description: "Page title for SSH keys",
  },
  "userSettings.subscriptionStatus.active": {
    message: "Actif",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Essai",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "En retard de paiement",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Impayé",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Incomplet",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Expiré",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Annulé",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "En pause",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Abonnement",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Abonnement annulé avec succès",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Abonnement mis à jour avec succès",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "Système",
    description: "System theme option",
  },
  "userSettings.theme": {
    message: "Thème",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Sombre",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Clair",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Système",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Le titre doit contenir moins de 100 caractères",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Le titre est requis",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Impossible d'ouvrir le portail de facturation. Veuillez réessayer plus tard.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Forfait inconnu",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Profil utilisateur",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Nom d'utilisateur mis à jour avec succès",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Hebdomadaire",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Oui, supprimer mon compte",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Vos informations de compte",
    description: "Description for user profile section",
  },
  "userSettings.aiCfoUsage": {
    message: "Jetons IA",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} jetons utilisés ce mois-ci",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} jetons utilisés ce mois-ci (illimité)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "L'utilisation est indisponible pour le moment.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Forfait actuel",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Forfait gratuit",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Entreprise",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Utilisation",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Grands livres",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} grands livres",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Facturation",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Illimité",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/mois",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} jetons IA / mois",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Jetons IA illimités",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Grands livres illimités",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} grands livres",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} grand livre",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_many": {
    message: "{formattedCount} grands livres",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} grands livres",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.unlimitedDirectives": {
    message: "Directives illimitées",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} directives",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Collaborateurs illimités",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Jusqu'à {formattedCount} collaborateurs par grand livre",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Jusqu'à {formattedCount} collaborateur par grand livre",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_many": {
    message: "Jusqu'à {formattedCount} collaborateurs par grand livre",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Jusqu'à {formattedCount} collaborateurs par grand livre",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Vous utilisez {percentage} % de vos jetons IA mensuels. Mettez à niveau pour éviter les interruptions.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "empreinte digitale",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "Annuel",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Cycle de facturation",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Forfaits",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Passer à l'annuel",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Passer au mensuel",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Rétrograder",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Nous contacter",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} facturés annuellement",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Économisez {percent} %",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Payez à l'année : {yearly} par an au lieu de {monthlyTotal}, soit {saving} d'économie par an.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/an",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Ancien tarif",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Confirmation de votre paiement…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Vous êtes désormais sur {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Renouvellement le {date} pour {amount}. Vous recevrez le reçu par e-mail.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Désormais inclus : {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Paiement reçu. Votre forfait apparaîtra d'ici une minute ; actualisez pour vérifier.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Actualiser",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Revenir où vous étiez",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Commencer à utiliser {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Le paiement a été annulé. Rien n'a été facturé.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Voir la facturation",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Passer à {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Calcul du coût de ce changement…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "Impossible de calculer le prix de ce changement. Réessayez.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Prend effet aujourd'hui.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "À payer aujourd'hui",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "Inclut un crédit de {credit} pour le temps non utilisé de votre forfait actuel.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Puis {amount}, prochain prélèvement le {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Prélevé sur {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Ce que vous obtenez",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Payer {amount} et changer",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Continuer vers le paiement",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Pas maintenant",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "Le temps non utilisé est toujours crédité : vous ne payez jamais deux fois.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "Vous avez déjà ce forfait.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Vous gardez ce forfait à un ancien tarif plus bas ; changer ne ferait que l'augmenter.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Votre compte a plus d'un abonnement actif. Contactez l'assistance pour changer de forfait.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "Aucun abonnement actif à modifier. Actualisez la page pour choisir un forfait.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Votre dernier paiement de renouvellement n'a pas abouti. Mettez à jour votre moyen de paiement dans Gérer la facturation, puis changez de forfait.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "À partir du {date}. Vous conservez {plan} jusque-là.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Rien à payer aujourd'hui.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Ce qui change le {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Collaborateurs par grand livre",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "Jetons IA par mois",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "vous en avez {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Tous vos grands livres restent à vous et continuent de fonctionner. Vous ne pourrez en créer un nouveau qu'une fois sous la nouvelle limite de {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Planifier la rétrogradation",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Planifier le changement",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Conserver {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Prévu pour le {date}. Rien ne change d'ici là.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Ceci remplace votre changement prévu vers {plan} le {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "Votre résiliation est aussi annulée : votre abonnement continue.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Votre tarif actuel n'est plus proposé ; il prend fin avec ce changement.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} en facturation mensuelle peut commencer à votre renouvellement le {date}. Vous voulez {plan} dès aujourd'hui ?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message:
      "Obtenir {plan} aujourd'hui en facturation annuelle — {amount} maintenant",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Passer à {plan} mensuel le {date} — rien aujourd'hui",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "S'applique à votre renouvellement",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "N'est plus inclus",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Directives",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Prévu",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "Passe à {plan} le {date}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} prend fin le {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Garder l'actuel",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Votre forfait reste tel quel.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "Votre changement prévu n'a pas pu être annulé. Réessayez.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "Résilier {plan} ?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "Vous conservez {plan} jusqu'au {date}. Ensuite, vous passez au forfait gratuit : {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Vos livres sont en texte brut : exportez-les quand vous voulez. Rien n'est supprimé.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Autres options",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Passer à l'annuel — {price}/mois",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Passer à {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Quelle est la raison principale ? (facultatif)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Trop cher",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Il manque une fonctionnalité",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Je ne l'utilise pas",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Je change d'outil",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Autre",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Votre banque doit approuver ce paiement. Rien ne change d'ici là ; après l'approbation, actualisez cette page.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "En attente de l'approbation du paiement par votre banque…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Approuver le paiement",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "Votre banque n'a pas approuvé le paiement. Rien n'a changé.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Utiliser une autre carte",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Sauvegardes automatiques",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Automatisation et intégrations avancées",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Authentification unique (SSO) via OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Consolidation multi-entités",
    description: "Plan feature from the pricing table",
  },
};

export default frUserSettings;
