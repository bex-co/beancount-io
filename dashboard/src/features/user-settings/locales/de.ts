import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const deUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.de,
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
  "userSettings.createKey": {
    message: "Schlüssel erstellen",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Neuen SSH-Schlüssel erstellen",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Fügen Sie einen neuen öffentlichen SSH-Schlüssel für den Git-Repository-Zugriff hinzu.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
      "Fügen Sie hier Ihren öffentlichen Schlüssel ein. Er beginnt meist mit ssh-ed25519 oder ssh-rsa; anzeigen können Sie ihn mit cat ~/.ssh/id_ed25519.pub. Öffentliche PEM-Schlüssel werden ebenfalls akzeptiert.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Öffentlicher Schlüssel ist erforderlich",
    description: "Validation error for missing public key",
  },
  "userSettings.startsOn": {
    message: "Beginnt am",
    description: "Label for when a deferred Stripe plan starts",
  },
  "userSettings.renewsOn": {
    message: "Verlängert am",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message: "Ihr App-Store-Plan endet am {date}. Dieser Plan beginnt dann.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message: "Ihr Google-Play-Plan endet am {date}. Dieser Plan beginnt dann.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "Ihr App-Store-Plan läuft bis {date}, und dieser Plan wird heute berechnet.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Ihr Google-Play-Plan läuft bis {date}, und dieser Plan wird heute berechnet.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Abrechnung über Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Abrechnung über den App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Abrechnung über Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Verwalten Sie das Abo auf Ihrem iPhone oder iPad: Einstellungen → Ihr Name → Abonnements.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Bei Google Play verwalten",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Endet am {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Wechselt am {date} zu {plan}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.subscriptionStatus.active": {
    message: "Aktiv",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Beginnt später",
    description:
      "Billing badge for a Stripe subscription waiting for a store plan to end before its first charge (ADR 001 D15). No plan is sold with a trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Überfällig",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Unbezahlt",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Unvollständig",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Abgelaufen",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Gekündigt",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "Pausiert",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Abonnement",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Abonnement erfolgreich gekündigt",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Abonnement erfolgreich aktualisiert",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "System",
    description: "System theme option",
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
    message: "KI-Tokens",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} Tokens in diesem Monat verbraucht",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} Tokens in diesem Monat verbraucht (unbegrenzt)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "Der Verbrauch ist derzeit nicht verfügbar.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Aktueller Plan",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Kostenloser Plan",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Unternehmen",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Nutzung",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Hauptbücher",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} Hauptbücher",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Abrechnung",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Unbegrenzt",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/Monat",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} KI-Tokens / Monat",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Unbegrenzte KI-Tokens",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Unbegrenzte Hauptbücher",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} Hauptbücher",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} Hauptbuch",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} Hauptbücher",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
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
    message: "Bis zu {formattedCount} Mitarbeiter pro Hauptbuch",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Bis zu {formattedCount} Mitarbeiter pro Hauptbuch",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Bis zu {formattedCount} Mitarbeiter pro Hauptbuch",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
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
  "userSettings.yearly": {
    message: "Jährlich",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Abrechnungszeitraum",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Pläne",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Auf jährlich umstellen",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Auf monatlich umstellen",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Herabstufen",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Kontakt aufnehmen",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} jährlich abgerechnet",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "{percent} % sparen",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Jährlich zahlen: {yearly} pro Jahr statt {monthlyTotal} – Sie sparen {saving} im Jahr.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/Jahr",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Bisheriger Preis",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Zahlung wird bestätigt …",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Sie nutzen jetzt {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Verlängert sich am {date} für {amount}. Den Beleg erhalten Sie per E-Mail.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Jetzt enthalten: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Zahlung eingegangen. Ihr Plan erscheint in einer Minute; aktualisieren Sie zur Kontrolle.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Aktualisieren",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Zurück zur vorherigen Seite",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "{plan} jetzt nutzen",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Der Bezahlvorgang wurde abgebrochen. Es wurde nichts berechnet.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Abrechnung anzeigen",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Wechsel zu {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Kosten dieser Änderung werden berechnet …",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message:
      "Der Preis dieser Änderung konnte nicht berechnet werden. Versuchen Sie es erneut.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Gilt ab heute.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "Heute fällig",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "Enthält eine Gutschrift von {credit} für die ungenutzte Zeit Ihres aktuellen Plans.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Danach {amount}, nächste Abbuchung am {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Abgebucht von {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Das erhalten Sie",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "{amount} zahlen und wechseln",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Weiter zur Zahlung",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Nicht jetzt",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "Ungenutzte Zeit wird immer gutgeschrieben – Sie zahlen nie doppelt.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "Sie haben diesen Plan bereits.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Sie behalten diesen Plan zu einem älteren, niedrigeren Preis; ein Wechsel würde ihn nur erhöhen.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Ihr Konto hat mehr als ein aktives Abonnement. Wenden Sie sich an den Support, um den Plan zu wechseln.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "Es gibt kein aktives Abonnement, das geändert werden kann. Laden Sie die Seite neu, um einen Plan zu wählen.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Ihre letzte Verlängerungszahlung ist fehlgeschlagen. Aktualisieren Sie Ihre Zahlungsmethode unter „Abrechnung verwalten“ und wechseln Sie dann den Plan.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Gilt ab {date}. Bis dahin behalten Sie {plan}.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Heute ist nichts zu zahlen.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Was sich am {date} ändert",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Mitarbeiter pro Hauptbuch",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "KI-Tokens pro Monat",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "Sie haben {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Alle Hauptbücher bleiben Ihre und funktionieren weiter. Neue können Sie erst anlegen, wenn Sie unter dem neuen Limit von {max} liegen.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Herabstufung planen",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Wechsel planen",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "{plan} behalten",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Geplant für {date}. Bis dahin ändert sich nichts.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Dies ersetzt Ihren geplanten Wechsel zu {plan} am {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message:
      "Damit wird auch Ihre Kündigung zurückgenommen; Ihr Abonnement läuft weiter.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Ihr aktueller Preis wird nicht mehr angeboten und endet mit diesem Wechsel.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} mit monatlicher Abrechnung kann zu Ihrer Verlängerung am {date} beginnen. Möchten Sie {plan} schon heute?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "{plan} heute mit jährlicher Abrechnung – jetzt {amount}",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Am {date} zu {plan} monatlich wechseln – heute nichts",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Gilt ab Ihrer Verlängerung",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Nicht mehr enthalten",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Direktiven",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Geplant",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "Wechselt am {date} zu {plan}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} endet am {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Aktuellen behalten",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Ihr Plan bleibt, wie er ist.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message:
      "Ihr geplanter Wechsel konnte nicht zurückgenommen werden. Versuchen Sie es erneut.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "{plan} kündigen?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "Sie behalten {plan} bis {date}. Danach nutzen Sie den kostenlosen Plan: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Ihre Bücher sind Klartext – exportieren Sie sie jederzeit. Nichts wird gelöscht.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Weitere Möglichkeiten",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Zu jährlich wechseln – {price}/Monat",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Zu {plan} herabstufen",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Was ist der Hauptgrund? (optional)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Zu teuer",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Eine Funktion fehlt",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Ich nutze es nicht",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Ich wechsle das Werkzeug",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Anderes",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Ihre Bank muss diese Zahlung bestätigen. Bis dahin ändert sich nichts; aktualisieren Sie diese Seite nach der Bestätigung.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Warten, bis Ihre Bank die Zahlung bestätigt …",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Zahlung bestätigen",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message:
      "Ihre Bank hat die Zahlung nicht bestätigt. Es hat sich nichts geändert.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Andere Karte verwenden",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Automatische Sicherungen",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Erweiterte Automatisierung und Integrationen",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Einmalanmeldung (SSO) mit OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Konsolidierung mehrerer Unternehmen",
    description: "Plan feature from the pricing table",
  },
};

export default deUserSettings;
