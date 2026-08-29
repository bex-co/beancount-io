import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const frUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.fr,
  "userSettings.accessUntil": {
    message: "Accès jusqu'au",
    description: "Label for access remaining until date",
  },
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
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Êtes-vous sûr de vouloir annuler votre abonnement? Vous continuerez à avoir accès jusqu'à la fin de votre période de facturation actuelle.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Annuler l'abonnement?",
    description: "Confirmation dialog title for canceling subscription",
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
  "userSettings.confirmCancel": {
    message: "Oui, annuler l'abonnement",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Créer une clé",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Créer une nouvelle clé API",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Ajoutez une nouvelle clé publique pour vous authentifier avec l'API Beancount.",
    description: "Dialog description for creating API key",
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
      'Collez le contenu de votre clé publique ici. Il doit commencer par "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
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
  "userSettings.subscription": {
    message: "Abonnement",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "L'abonnement a été annulé",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Abonnement annulé avec succès",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Abonnement mis à jour avec succès",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Votre paiement nécessite une authentification supplémentaire. Veuillez vérifier votre e-mail ou contacter l'émetteur de votre carte.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "Système",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Mode test",
    description: "Label indicating Stripe is in test/development mode",
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
    message: "{count} jetons IA / mois",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedLedgers": {
    message: "Grands livres illimités",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{count} grand(x) livre(s)",
    description: "Ledger allowance for a subscription tier",
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
    message: "Jusqu'à {count} collaborateur(s) par grand livre",
    description: "Collaborator allowance for each ledger",
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
};

export default frUserSettings;
