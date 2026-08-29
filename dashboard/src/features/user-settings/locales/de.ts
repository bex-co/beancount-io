import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const deUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.de,
  "userSettings.accessUntil": {
    message: "Zugriff bis",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Konto erfolgreich gelöscht",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "Neuen Schlüssel hinzufügen",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Hinzugefügt",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Alle hochgeladenen Dokumente und Anhänge",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Alle Ihre Hauptbücher und der Transaktionsverlauf",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Alle Einstellungen und Präferenzen",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Alle Transaktionen und Aufzeichnungen",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "Erscheinungsbild",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Abonnement kündigen",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Sind Sie sicher, dass Sie Ihr Abonnement kündigen möchten? Sie behalten den Zugriff bis zum Ende Ihres aktuellen Abrechnungszeitraums.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Abonnement kündigen?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Wird gekündigt...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Diese Aktion kann nicht rückgängig gemacht werden.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Name ändern",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Benutzernamen ändern",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Ja, Abonnement kündigen",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Schlüssel erstellen",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Neuen API-Schlüssel erstellen",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Fügen Sie einen neuen öffentlichen Schlüssel hinzu, um sich bei der Beancount-API zu authentifizieren.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Neuen Schlüssel erstellen",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Wird erstellt...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Sprache",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "Passen Sie an, wie die Anwendung aussieht und sich anfühlt",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Gefahrenzone",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Dunkel",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Konto löschen",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Zur Bestätigung geben Sie bitte Ihren Benutzernamen "{username}" unten ein:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Benutzernamen eingeben",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Diese Aktion kann nicht rückgängig gemacht werden. Dies löscht Ihr Konto dauerhaft und entfernt alle Ihre Daten von unseren Servern.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Konto löschen?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Löschen Sie Ihr Konto und alle zugehörigen Daten dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Schlüssel löschen",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "SSH-Schlüssel löschen",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Sind Sie sicher, dass Sie den Schlüssel löschen möchten",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Wird gelöscht...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Geben Sie unten Ihren Namen ein",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Geben Sie unten Ihren neuen Benutzernamen ein",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Neuen Benutzernamen eingeben",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Fehler beim Erstellen des Schlüssels",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Fehler beim Laden der Einstellungen",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Kündigung des Abonnements fehlgeschlagen",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Abonnement fortsetzen",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "Abonnement fortsetzen?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Möchtest du dein Abonnement wirklich fortsetzen? Dein Abonnement verlängert sich weiterhin automatisch und dir wird am Ende des aktuellen Abrechnungszeitraums erneut eine Rechnung gestellt.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Ja, Abonnement fortsetzen",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Wird fortgesetzt...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Abonnement erfolgreich fortgesetzt",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Fortsetzung des Abonnements fehlgeschlagen",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message:
      "Checkout-Sitzung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Schlüssel konnten nicht geladen werden",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Beim Laden Ihrer SSH-Schlüssel ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Einstellungen konnten nicht geladen werden",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Abonnementstatus konnte nicht geladen werden",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Vorname",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Folgendes wird dauerhaft gelöscht:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Allgemein",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "Einladen",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "Unwiderrufliche und destruktive Aktionen",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Schlüsseltitel",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Ein beschreibender Name für diesen Schlüssel, um ihn später zu identifizieren.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "z.B. Mein Entwicklungsschlüssel",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Nachname",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Zuletzt innerhalb der letzten 3 Monate verwendet",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Zuletzt innerhalb der letzten 3 Wochen verwendet",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Zuletzt vor mehr als 3 Monaten verwendet",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Zuletzt innerhalb der letzten Woche verwendet",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Hell",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Ihre Kontoinformationen werden geladen...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Sitzungsinformationen werden geladen...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Ihre SSH-Schlüssel werden geladen...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Abonnementdetails werden geladen...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Design-Einstellungen werden geladen...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "Verwalten Sie Ihre aktive Sitzung",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Abrechnung verwalten",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Verwalten Sie Ihr Abonnement und die Abrechnung",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Monatlich",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Name",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Nie verwendet",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Neuer SSH-Schlüssel",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "Keine SSH-Schlüssel",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Sie haben noch keine SSH-Schlüssel erstellt. Erstellen Sie Ihren ersten Schlüssel, um mit dem sicheren Repository-Zugriff zu beginnen.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Nicht festgelegt",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "Wird geöffnet...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Öffentlicher Schlüssel",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Fügen Sie hier den Inhalt Ihres öffentlichen Schlüssels ein. Er sollte mit "-----BEGIN PUBLIC KEY-----" beginnen.',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Öffentlicher Schlüssel ist erforderlich",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Verlängert am",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "Wählen Sie Ihr bevorzugtes Farbschema",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Wählen Sie Ihre bevorzugte Sprache",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Sitzung",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "Melden Sie sich von Ihrem Konto ab und löschen Sie Ihre Sitzung.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH-Schlüssel",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "Abonnement",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Abonnement wurde gekündigt",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Abonnement erfolgreich gekündigt",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Abonnement erfolgreich aktualisiert",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Ihre Zahlung erfordert eine zusätzliche Authentifizierung. Bitte überprüfen Sie Ihre E-Mail oder kontaktieren Sie Ihren Kartenaussteller.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "System",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Testmodus",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "Design",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Dunkel",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Hell",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "System",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Der Titel darf maximal 100 Zeichen lang sein",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Titel ist erforderlich",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Abrechnungsportal kann nicht geöffnet werden. Bitte versuchen Sie es später erneut.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Unbekannter Plan",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Benutzer Profile",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Benutzername erfolgreich aktualisiert",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Wöchentlich",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Ja, mein Konto löschen",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Ihre Kontoinformationen",
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
    message: "{count} KI-Tokens / Monat",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedLedgers": {
    message: "Unbegrenzte Hauptbücher",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{count} Hauptbuch(er)",
    description: "Ledger allowance for a subscription tier",
  },
  "userSettings.unlimitedDirectives": {
    message: "Unbegrenzte Anweisungen",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} Direktiven",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Unbegrenzte Anzahl an Mitarbeitern",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Bis zu {count} Mitarbeiter pro Hauptbuch",
    description: "Collaborator allowance for each ledger",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Sie verwenden {percentage} % Ihrer monatlichen KI-Tokens. Aktualisieren Sie, um Unterbrechungen zu vermeiden.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "Fingerabdruck",
    description: "Label for an SSH key fingerprint",
  },
};

export default deUserSettings;
