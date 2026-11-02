import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const nlUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.nl,
  "userSettings.accountDeleted": {
    message: "Account succesvol verwijderd",
    description: "Success message when account is deleted",
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
  "userSettings.appearance": {
    message: "Uiterlijk",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Abonnement annuleren",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "Annuleren...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Deze actie kan niet ongedaan gemaakt worden.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Naam wijzigen",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Gebruikersnaam wijzigen",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "Sleutel aanmaken",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Nieuwe SSH-sleutel maken",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Voeg een nieuwe openbare SSH-sleutel toe voor toegang tot de Git-repository.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
  "userSettings.deleteAccountConfirmMessage": {
    message: 'Om te bevestigen, typ uw gebruikersnaam "{username}" hieronder:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Voer uw gebruikersnaam in",
    description: "Placeholder text for deletion confirmation input",
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
    message: "Abonnement hervatten?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Weet je zeker dat je je abonnement wilt hervatten? Je abonnement wordt weer automatisch verlengd en aan het einde van je huidige factureringsperiode worden opnieuw kosten in rekening gebracht.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Ja, abonnement hervatten",
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
  "userSettings.invite": {
    message: "Uitnodigen",
    description: "Invite action button",
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
  "userSettings.opening": {
    message: "Openen...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Openbare sleutel",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "Plak hier uw openbare sleutel. Deze begint meestal met ssh-ed25519 of ssh-rsa; toon hem met cat ~/.ssh/id_ed25519.pub. Openbare PEM-sleutels worden ook geaccepteerd.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Openbare sleutel is verplicht",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Verlengt op",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message:
      "Je App Store-abonnement eindigt op {date}. Dit abonnement begint dan.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "Je Google Play-abonnement eindigt op {date}. Dit abonnement begint dan.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "Je App Store-abonnement loopt tot {date}, en dit abonnement wordt vandaag gefactureerd.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Je Google Play-abonnement loopt tot {date}, en dit abonnement wordt vandaag gefactureerd.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Gefactureerd via Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Gefactureerd via de App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Gefactureerd via Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Beheer het op je iPhone of iPad: Instellingen → je naam → Abonnementen.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Beheren op Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Eindigt op {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Wijzigt op {date} naar {plan}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.signOutDescription": {
    message: "Log uit van uw account en wis uw sessie.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH-sleutels",
    description: "Page title for SSH keys",
  },
  "userSettings.subscriptionStatus.active": {
    message: "Actief",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Proefperiode",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Achterstallig",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Onbetaald",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Onvolledig",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Verlopen",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Opgezegd",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "Gepauzeerd",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Abonnement",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Abonnement succesvol geannuleerd",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Abonnement succesvol bijgewerkt",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "Systeem",
    description: "System theme option",
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
  "userSettings.unableToOpenBillingPortal": {
    message: "Kan factureringsportaal niet openen. Probeer het later opnieuw.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Onbekend abonnement",
    description: "Fallback when plan name is not available",
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
    message: "AI-tokens",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens gebruikt deze maand",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens gebruikt deze maand (onbeperkt)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "Het verbruik is momenteel niet beschikbaar.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Huidig abonnement",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Gratis abonnement",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Zakelijk",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Gebruik",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Grootboeken",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} grootboeken",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Facturering",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Onbeperkt",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/maand",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} AI-tokens/maand",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Onbeperkte AI-tokens",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Onbeperkte grootboeken",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} grootboeken",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} grootboek",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} grootboeken",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.unlimitedDirectives": {
    message: "Onbeperkte richtlijnen",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} richtlijnen",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Onbeperkt aantal bijdragers",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Maximaal {formattedCount} medewerkers per grootboek",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Maximaal {formattedCount} medewerker per grootboek",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Maximaal {formattedCount} medewerkers per grootboek",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Je gebruikt {percentage}% van je maandelijkse AI-tokens. Upgrade om onderbrekingen te voorkomen.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "vingerafdruk",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "Jaarlijks",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Factuurperiode",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Abonnementen",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Overstappen op jaarlijks",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Overstappen op maandelijks",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Downgraden",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Neem contact op",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} per jaar gefactureerd",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Bespaar {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Betaal per jaar: {yearly} per jaar in plaats van {monthlyTotal} — je bespaart {saving} per jaar.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/jaar",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Oude prijs",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Je betaling wordt bevestigd…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Je hebt nu {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Wordt verlengd op {date} voor {amount}. Je ontvangt het betaalbewijs per e-mail.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Nu inbegrepen: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Betaling ontvangen. Je abonnement verschijnt binnen een minuut; vernieuw de pagina om het te controleren.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Vernieuwen",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Terug naar waar je was",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Aan de slag met {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Het afrekenen is geannuleerd. Er is niets in rekening gebracht.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Facturering bekijken",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Wijzigen naar {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "We berekenen wat deze wijziging kost…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message:
      "We konden de prijs van deze wijziging niet berekenen. Probeer het opnieuw.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Gaat vandaag in.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "Vandaag te betalen",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "Inclusief een tegoed van {credit} voor de ongebruikte tijd van je huidige abonnement.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Daarna {amount}, volgende betaling op {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Afgeschreven van {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Wat je krijgt",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Betaal {amount} en wijzig",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Doorgaan naar betalen",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Niet nu",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "Ongebruikte tijd wordt altijd verrekend — je betaalt nooit dubbel.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "Je hebt dit abonnement al.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Je houdt dit abonnement tegen een oudere, lagere prijs; wijzigen zou die alleen verhogen.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Je account heeft meer dan één actief abonnement. Neem contact op met support om van abonnement te wisselen.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "Er is geen actief abonnement om te wijzigen. Vernieuw de pagina om een abonnement te kiezen.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Je laatste verlengingsbetaling is niet gelukt. Werk je betaalmethode bij onder Facturering beheren en wijzig daarna je abonnement.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Gaat in op {date}. Tot dan houd je {plan}.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Vandaag hoef je niets te betalen.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Wat er verandert op {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Medewerkers per grootboek",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "AI-tokens per maand",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "je hebt er {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Al je grootboeken blijven van jou en blijven werken. Je kunt pas een nieuwe maken als je onder de nieuwe limiet van {max} zit.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Downgrade inplannen",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Wissel inplannen",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "{plan} houden",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Gepland voor {date}. Tot dan verandert er niets.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Dit vervangt je geplande wijziging naar {plan} op {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "Dit trekt ook je opzegging in, dus je abonnement loopt door.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Je huidige prijs wordt niet meer aangeboden en stopt met deze wijziging.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} met maandelijkse facturering kan ingaan bij je verlenging op {date}. Wil je {plan} vandaag al?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "{plan} vandaag met jaarlijkse facturering — nu {amount}",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Op {date} overstappen naar {plan} maandelijks — vandaag niets",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Gaat in bij je verlenging",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Niet meer inbegrepen",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Richtlijnen",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Gepland",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "Wordt op {date} {plan}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} eindigt op {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Huidige houden",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Je abonnement blijft zoals het is.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message:
      "Je geplande wijziging kon niet ongedaan worden gemaakt. Probeer het opnieuw.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "{plan} opzeggen?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "Je houdt {plan} tot {date}. Daarna zit je op het gratis abonnement: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Je boeken zijn platte tekst — exporteer ze wanneer je wilt. Er wordt niets verwijderd.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Andere mogelijkheden",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Overstappen naar jaarlijks — {price}/maand",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Downgraden naar {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Wat is de belangrijkste reden? (optioneel)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Te duur",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Er ontbreekt een functie",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Ik gebruik het niet",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Ik stap over naar een ander programma",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Anders",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Je bank moet deze betaling goedkeuren. Tot dan verandert er niets; vernieuw deze pagina na de goedkeuring.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Wachten tot je bank de betaling goedkeurt…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Betaling goedkeuren",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message:
      "Je bank heeft de betaling niet goedgekeurd. Er is niets veranderd.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Andere kaart gebruiken",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Automatische back-ups",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Geavanceerde automatisering en integraties",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Single sign-on (SSO) via OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Consolidatie van meerdere entiteiten",
    description: "Plan feature from the pricing table",
  },
};

export default nlUserSettings;
