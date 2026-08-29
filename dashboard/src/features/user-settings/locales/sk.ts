import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const skUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.sk,
  "userSettings.accessUntil": {
    message: "Prístup do",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Účet bol úspešne vymazaný",
    description: "Success message when account is deleted",
  },
  "userSettings.addNewKey": {
    message: "Pridať nový klúč",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Pridaný",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Všetky nahrané dokumenty a prílohy",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Všetky vaše knihy a história transakcií",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Všetky predvoľby a nastavenia",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Všetky transakcie a záznamy",
    description: "Item in delete account list",
  },
  "userSettings.appearance": {
    message: "Vzhľad",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Zrušiť predplatné",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Ste si istí, že chcete zrušiť predplatné? Prístup budete mať až do konca aktuálneho fakturačného obdobia.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Zrušiť predplatné?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Zrušovanie...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Túto akciu nie je možné vrátiť späť.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Zmeniť meno",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Zmeniť používateľské meno",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Áno, zrušiť predplatné",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Vytvoriť klúč",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Vytvoriť nový API klúč",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Pridajte nový verejný klúč pre autentifikáciu s Beancount API.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Vytvoriť nový klúč",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Vytváram...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Jazyk",
    description: "Label showing current language selection",
  },
  "userSettings.customizeAppearance": {
    message: "Prispôsobte si vzhľad a pocit aplikácie",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Nebezpečná zóna",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Tmavá",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Vymazať účet",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message:
      'Pre potvrdenie zadajte svoje používateľské meno "{username}" nižšie:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Zadajte vaše používateľské meno",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Túto akciu nie je možné vrátiť späť. Natrvalo vymaže váš účet a odstráni všetky vaše údaje z našich serverov.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Vymazať účet?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Natrvalo vymazať váš účet a všetky súvisiace údaje. Túto akciu nie je možné vrátiť späť.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Vymazať klúč",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Vymazať SSH klúč",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Ste si istí, že chcete vymazať klúč",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Vymazávam...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Zadajte svoje meno nižšie",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Zadajte svoje nové používateľské meno nižšie",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Zadajte nové používateľské meno",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Chyba pri vytváraní kľúča",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Chyba pri načítavaní nastavení",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Nepodarilo sa zrušiť predplatné",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Obnoviť predplatné",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "Obnoviť predplatné?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Naozaj chcete obnoviť predplatné? Bude sa naďalej automaticky obnovovať a na konci aktuálneho fakturačného obdobia vám bude znova účtovaný poplatok.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Áno, obnoviť predplatné",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Obnovovanie...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Predplatné úspešne obnovené",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Nepodarilo sa obnoviť predplatné",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Nepodarilo sa vytvoriť reláciu pokladne. Skúste to znova.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Načítanie klúčov zlyhalo",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Pri načítavaní vašich SSH klúčov došlo k chybe. Prosím skúste to znova.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Načítanie nastavení zlyhalo",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Načítanie stavu predplatného zlyhalo",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Meno",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Nasledujúce bude natrvalo vymazané:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Všeobecné",
    description: "General settings section label",
  },
  "userSettings.invite": {
    message: "Pozvať",
    description: "Invite action button",
  },
  "userSettings.irreversibleActions": {
    message: "Nevratné a deštruktívne akcie",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Názov klúča",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Popisný názov pre tento klúč, ktorý vám pomôže ho neskôr identifikovať.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "napr. Môj vývojový klúč",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Priezvisko",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Naposledy použitý v posledných 3 mesiacoch",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Naposledy použitý v posledných 3 týždňoch",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Naposledy použitý pred viac ako 3 mesiacmi",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Naposledy použitý v poslednom týždni",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Svetlá",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Načítavam informácie o účte...",
    description: "Loading message for account information",
  },
  "userSettings.loadingSessionInformation": {
    message: "Načítavam informácie o relácii...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Načítavam vaše SSH klúče...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Načítavam podrobnosti predplatného...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Načítavam nastavenia témy...",
    description: "Loading message for theme settings",
  },
  "userSettings.manageActiveSession": {
    message: "Spravujte svoju aktívnu reláciu",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Spravovať fakturáciu",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Spravujte svoje predplatné a fakturáciu",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Mesačne",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Meno",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Nikdy nepoužitý",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Nový SSH klúč",
    description: "Button text to create new SSH key",
  },
  "userSettings.noSshKeys": {
    message: "Žiadne SSH klúče",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Zatiaľ ste nevytvorili žiadne SSH klúče. Vytvorte svoj prvý klúč pre začiatok zabezpečeného prístupu k repozitáru.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Nenastavené",
    description: "Placeholder when a field has no value",
  },
  "userSettings.opening": {
    message: "Otváranie...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Verejný klúč",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Vložte sem obsah vášho verejného klúča. Mal by začínať s "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Verejný klúč je povinný",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Obnoví sa",
    description: "Label for subscription renewal date",
  },
  "userSettings.selectColorTheme": {
    message: "Vyberte si preferovanú farebnú tému",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Vyberte si preferovaný jazyk",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Relácia",
    description: "Session management section title",
  },
  "userSettings.signOutDescription": {
    message: "Odhláste sa zo svojho účtu a vymažte reláciu.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH Klúče",
    description: "Page title for SSH keys",
  },
  "userSettings.subscription": {
    message: "Predplatné",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Predplatné bolo zrušené",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Predplatné úspešne zrušené",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Predplatné bolo úspešne aktualizované",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Vaša platba vyžaduje dodatočné overenie. Skontrolujte svoj e-mail alebo kontaktujte vydavateľa karty.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.system": {
    message: "Systémová",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Testovací režim",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.theme": {
    message: "Téma",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Tmavá",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Svetlá",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Systémová",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Názov musí mať menej ako 100 znakov",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Názov je povinný",
    description: "Validation error for missing title",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "Nie je možné otvoriť fakturačný portál. Skúste to znova neskôr.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Neznámy plán",
    description: "Fallback when plan name is not available",
  },
  "userSettings.userProfile": {
    message: "Používateľský profil",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Používateľské meno úspešne aktualizované",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Týždenne",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Áno, vymazať môj účet",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Informácie o vašom účte",
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
    message: "{count} AI tokenov / mesiac",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedLedgers": {
    message: "Neobmedzené účtovné knihy",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{count} účtovné knihy",
    description: "Ledger allowance for a subscription tier",
  },
  "userSettings.unlimitedDirectives": {
    message: "Neobmedzené smernice",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} direktív",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Neobmedzený počet spolupracovníkov",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Až {count} spolupracovníkov na jednu účtovnú knihu",
    description: "Collaborator allowance for each ledger",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Používate {percentage}% svojich mesačných tokenov AI. Inovujte, aby ste sa vyhli prerušeniam.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "odtlačok prsta",
    description: "Label for an SSH key fingerprint",
  },
};

export default skUserSettings;
