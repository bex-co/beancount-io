export interface TranslationEntry {
  message: string;
  description: string;
}

const nlUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accessUntil": {
    message: "Toegang tot",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Account succesvol verwijderd",
    description: "Success message when account is deleted",
  },
  "userSettings.accountSettings": {
    message: "Account",
    description: "Section header for account settings",
  },
  "userSettings.addNewKey": {
    message: "Nieuwe sleutel toevoegen",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Toegevoegd",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Alle geüploade documenten en bijlagen",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Al uw grootboeken en transactiegeschiedenis",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Alle voorkeuren en instellingen",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Alle transacties en gegevens",
    description: "Item in delete account list",
  },
  "userSettings.appSettings": {
    message: "App-instellingen",
    description: "Section header for application settings",
  },
  "userSettings.appearance": {
    message: "Uiterlijk",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Abonnement annuleren",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Weet u zeker dat u uw abonnement wilt annuleren? U behoudt toegang tot het einde van uw huidige factureringsperiode.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Abonnement annuleren?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Annuleren...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Deze actie kan niet ongedaan gemaakt worden.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeLanguage": {
    message: "Wijzigen",
    description: "Button to change language",
  },
  "userSettings.changeName": {
    message: "Naam wijzigen",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Gebruikersnaam wijzigen",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Ja, abonnement annuleren",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Sleutel aanmaken",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Nieuwe API-sleutel aanmaken",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Voeg een nieuwe openbare sleutel toe om te authenticeren met de Beancount API.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Nieuwe sleutel aanmaken",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Aanmaken...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Taal",
    description: "Label showing current language selection",
  },
  "userSettings.currentPeriodEnds": {
    message: "Huidige periode eindigt",
    description: "Label for subscription period end date",
  },
  "userSettings.currentVersion": {
    message: "Versie",
    description: "Label showing current app version",
  },
  "userSettings.customizeAppearance": {
    message: "Pas aan hoe de applicatie eruitziet en aanvoelt",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Gevarenzone",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Donker",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Account verwijderen",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountAlertCancel": {
    message: "Annuleren",
    description: "Cancel button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertConfirm": {
    message: "Account verwijderen",
    description: "Confirm button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertMsg": {
    message:
      "Weet u zeker dat u uw account wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden en zal al uw gegevens permanent verwijderen.",
    description: "Warning message in account deletion confirmation dialog",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: 'Om te bevestigen, typ uw gebruikersnaam "{username}" hieronder:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPhrase": {
    message: "sudo delete my account",
    description: "Exact phrase user must type to confirm deletion",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Voer uw gebruikersnaam in",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountConfirmTitle": {
    message: "Account verwijdering bevestigen",
    description: "Title of account deletion confirmation step",
  },
  "userSettings.deleteAccountDescription": {
    message: "Account en gegevens permanent verwijderen",
    description: "Description of what account deletion does",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Deze actie kan niet ongedaan gemaakt worden. Dit zal uw account permanent verwijderen en al uw gegevens van onze servers verwijderen.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Account verwijderen?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Verwijder uw account en alle bijbehorende gegevens permanent. Deze actie kan niet ongedaan gemaakt worden.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Sleutel verwijderen",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "SSH-sleutel verwijderen",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Weet u zeker dat u de sleutel wilt verwijderen",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Verwijderen...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Voer hieronder uw naam in",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Voer hieronder uw nieuwe gebruikersnaam in",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Voer nieuwe gebruikersnaam in",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Fout bij het aanmaken van sleutel",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Fout bij laden instellingen",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Annuleren van abonnement mislukt",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Abonnement hervatten",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "[TODO] Resume Subscription?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "[TODO] Are you sure you want to resume your subscription? Your subscription will continue to renew automatically and you will be billed again at the end of your current billing period.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "[TODO] Yes, Resume Subscription",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Hervatten...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Abonnement succesvol hervat",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Hervatten van abonnement mislukt",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Betalingssessie maken mislukt. Probeer het opnieuw.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToCreateKey": {
    message: "Kan sleutel niet aanmaken. Probeer het opnieuw.",
    description: "Error message when key creation fails",
  },
  "userSettings.failedToDeleteAccount": {
    message: "Account verwijderen mislukt",
    description: "Error message when account deletion fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Sleutels laden mislukt",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Er is een fout opgetreden bij het laden van uw SSH-sleutels. Probeer het opnieuw.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Instellingen laden mislukt",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Abonnementsstatus laden mislukt",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Voornaam",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Het volgende zal permanent verwijderd worden:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Algemeen",
    description: "General settings section label",
  },
  "userSettings.helpCenter": {
    message: "Helpcentrum",
    description: "Link to help center",
  },
  "userSettings.inputKeyword": {
    message: "Voer een zoekwoord in",
    description: "Placeholder prompting user to enter keyword",
  },
  "userSettings.invite": {
    message: "Uitnodigen",
    description: "Invite action button",
  },
  "userSettings.inviteFriends": {
    message: "Vrienden uitnodigen",
    description: "Button or section title for inviting friends",
  },
  "userSettings.inviteSummary": {
    message:
      "Deel deze professionele tool voor financieel beheer en help anderen hun financiële toekomst opbouwen.",
    description: "Summary description of invite feature",
  },
  "userSettings.irreversibleActions": {
    message: "Onomkeerbare en destructieve acties",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Sleuteltitel",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Een beschrijvende naam voor deze sleutel om deze later te kunnen identificeren.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "bijv. Mijn ontwikkelsleutel",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Achternaam",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Laatst gebruikt binnen de laatste 3 maanden",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Laatst gebruikt binnen de laatste 3 weken",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Laatst gebruikt meer dan 3 maanden geleden",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Laatst gebruikt binnen de laatste week",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Licht",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Uw accountinformatie laden...",
    description: "Loading message for account information",
  },
  "userSettings.loadingAccountOptions": {
    message: "Accountopties laden...",
    description: "Loading message for account options",
  },
  "userSettings.loadingSessionInformation": {
    message: "Sessie-informatie laden...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Uw SSH-sleutels laden...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Abonnementsdetails laden...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Themavoorkeuren laden...",
    description: "Loading message for theme settings",
  },
  "userSettings.manage": {
    message: "Beheren",
    description: "Button to manage subscription",
  },
  "userSettings.manageActiveSession": {
    message: "Beheer uw actieve sessie",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Facturering beheren",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Beheer uw abonnement en facturering",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Maandelijks",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Naam",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Nooit gebruikt",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Nieuwe SSH-sleutel",
    description: "Button text to create new SSH key",
  },
  "userSettings.noActiveSubscription": {
    message: "Geen actief abonnement",
    description: "Label when user has no subscription",
  },
  "userSettings.noContactPermission": {
    message: "Contacten-machtiging ontbreekt.",
    description: "Error when contacts permission is denied",
  },
  "userSettings.noSshKeys": {
    message: "Geen SSH-sleutels",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "U heeft nog geen SSH-sleutels aangemaakt. Maak uw eerste sleutel aan om aan de slag te gaan met beveiligde repository-toegang.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Niet ingesteld",
    description: "Placeholder when a field has no value",
  },
  "userSettings.off": {
    message: "Uit",
    description: "Off state for toggles or subscriptions",
  },
  "userSettings.opening": {
    message: "Openen...",
    description: "Button text while opening billing portal",
  },
  "userSettings.processing": {
    message: "Verwerken...",
    description: "Button text while processing checkout",
  },
  "userSettings.publicKey": {
    message: "Openbare sleutel",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Plak hier de inhoud van uw openbare sleutel. Deze moet beginnen met "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Openbare sleutel is verplicht",
    description: "Validation error for missing public key",
  },
  "userSettings.recommend": {
    message:
      "Ik wil graag deze professionele tool voor financieel beheer delen die mij geholpen heeft mijn financiën effectief te organiseren.",
    description: "Pre-written recommendation message for sharing",
  },
  "userSettings.referral": {
    message: "Verwijzing",
    description: "Referral program label",
  },
  "userSettings.renewsOn": {
    message: "Verlengt op",
    description: "Label for subscription renewal date",
  },
  "userSettings.reviewApp": {
    message: "Bevalt het? Geef een review :)",
    description: "Prompt to review the app",
  },
  "userSettings.rewardDetail": {
    message:
      "Deel deze professionele tool voor financieel beheer en help anderen hun financiële toekomst opbouwen.",
    description: "Detailed description of referral rewards",
  },
  "userSettings.rewardSummary": {
    message: "Vrienden uitnodigen",
    description: "Summary of referral rewards",
  },
  "userSettings.selectColorTheme": {
    message: "Selecteer uw voorkeur kleurthema",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Selecteer uw voorkeur taal",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Sessie",
    description: "Session management section title",
  },
  "userSettings.settingsErrorMessage": {
    message:
      "Er is een fout opgetreden bij het laden van uw instellingen. Controleer uw verbinding en probeer het opnieuw.",
    description: "Detailed error message for settings loading failure",
  },
  "userSettings.shareError": {
    message: "Delen mislukt",
    description: "Error message when sharing fails",
  },
  "userSettings.signOutDescription": {
    message: "Log uit van uw account en wis uw sessie.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH-sleutels",
    description: "Page title for SSH keys",
  },
  "userSettings.subscribe": {
    message: "E-mail rapport",
    description: "Email report subscription feature label",
  },
  "userSettings.subscription": {
    message: "Abonnement",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Abonnement is geannuleerd",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Abonnement succesvol geannuleerd",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Abonnement succesvol bijgewerkt",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Uw betaling vereist extra verificatie. Controleer uw e-mail of neem contact op met uw kaartuitgever.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.supportSettings": {
    message: "Ondersteuning",
    description: "Section header for support settings",
  },
  "userSettings.system": {
    message: "Systeem",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Testmodus",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.thanksShare": {
    message: "Bedankt voor het delen!!",
    description: "Thank you message after sharing",
  },
  "userSettings.theme": {
    message: "Thema",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Donker",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Licht",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Systeem",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Titel moet minder dan 100 tekens bevatten",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Titel is verplicht",
    description: "Validation error for missing title",
  },
  "userSettings.trialProPlan": {
    message: "Upgrade naar Premium",
    description: "Button text for premium subscription upgrade",
  },
  "userSettings.trialProPlanComingSoon": {
    message: "Proef Pro-abonnement functie komt binnenkort!",
    description: "Toast message when trial Pro plan is clicked",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "Kan factureringsportaal niet openen. Probeer het later opnieuw.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Onbekend abonnement",
    description: "Fallback when plan name is not available",
  },
  "userSettings.updateFailed": {
    message: "Bijwerken abonnement mislukt",
    description: "Error message when update fails",
  },
  "userSettings.updateSuccess": {
    message: "Abonnement succesvol bijgewerkt",
    description: "Success message after updating subscription",
  },
  "userSettings.upgradeToProDescription": {
    message:
      "Upgrade naar Pro om premium functies en onbeperkte toegang te ontgrendelen.",
    description: "Description encouraging subscription upgrade",
  },
  "userSettings.userProfile": {
    message: "Gebruikersprofiel",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Gebruikersnaam succesvol bijgewerkt",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Wekelijks",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Ja, verwijder mijn account",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Uw accountinformatie",
    description: "Description for user profile section",
  },
  "userSettings.aiCfoUsage": {
    message: "AI Tokens",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageDescription": {
    message: "Monthly AI token usage for your current billing period",
    description: "Description for AI CFO usage section",
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
  "userSettings.customPricing": {
    message: "Custom pricing",
    description: "Price label for enterprise tier",
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
  "userSettings.collaboratorLimit": {
    message: "Up to {max} collaborators per ledger",
    description: "Collaborator limit description",
  },
  "userSettings.collaboratorLimitUnlimited": {
    message: "Unlimited collaborators per ledger",
    description: "Collaborator limit for unlimited tiers",
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
  "userSettings.planFeatureSummary": {
    message:
      "{tokens} AI tokens · {ledgers} ledgers · {collaborators} collaborators",
    description: "Summary of plan features in the current plan banner",
  },
};

export default nlUserSettings;
