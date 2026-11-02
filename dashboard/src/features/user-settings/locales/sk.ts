import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const skUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.sk,
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
  "userSettings.createKey": {
    message: "Vytvoriť klúč",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Vytvoriť nový SSH kľúč",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Pridajte nový verejný SSH kľúč na prístup k Git repozitáru.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
      "Vložte sem svoj verejný kľúč. Zvyčajne začína na ssh-ed25519 alebo ssh-rsa; vypíšete ho príkazom cat ~/.ssh/id_ed25519.pub. Akceptujú sa aj verejné kľúče PEM.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
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
  "userSettings.billedByStripe": {
    message: "Fakturované cez Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Fakturované cez App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Fakturované cez Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Spravujte ho v iPhone alebo iPade: Nastavenia → vaše meno → Predplatné.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Spravovať v Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Končí {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Zmení sa na {plan} {date}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.subscriptionStatus.active": {
    message: "Aktívne",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Skúšobné obdobie",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Po splatnosti",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Nezaplatené",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Neúplné",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Vypršané",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Zrušené",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "Pozastavené",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Predplatné",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Predplatné úspešne zrušené",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Predplatné bolo úspešne aktualizované",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "Systémová",
    description: "System theme option",
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
    message: "Tokeny AI",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokenov využitých tento mesiac",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokenov využitých tento mesiac (neobmedzené)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "Využitie momentálne nie je dostupné.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Aktuálny plán",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Bezplatný plán",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Podnikový",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Využitie",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Knihy",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} kníh",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Fakturácia",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Neobmedzené",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/mesiac",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} AI tokenov / mesiac",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Neobmedzené AI tokeny",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Neobmedzené účtovné knihy",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} účtovných kníh",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} účtovná kniha",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_few": {
    message: "{formattedCount} účtovné knihy",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 2-4",
  },
  "userSettings.includedLedgers_many": {
    message: "{formattedCount} účtovnej knihy",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for fractional counts",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} účtovných kníh",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 0 and 5 or more",
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
    message: "Až {formattedCount} spolupracovníkov na účtovnú knihu",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Až {formattedCount} spolupracovník na účtovnú knihu",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_few": {
    message: "Až {formattedCount} spolupracovníci na účtovnú knihu",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 2-4",
  },
  "userSettings.collaboratorsPerLedger_many": {
    message: "Až {formattedCount} spolupracovníka na účtovnú knihu",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for fractional counts",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Až {formattedCount} spolupracovníkov na účtovnú knihu",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for counts like 0 and 5 or more",
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
  "userSettings.yearly": {
    message: "Ročne",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Fakturačné obdobie",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Plány",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Prejsť na ročné platby",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Prejsť na mesačné platby",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Znížiť plán",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Kontaktujte nás",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} pri ročnej platbe",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Ušetrite {percent} %",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Plaťte ročne: {yearly} za rok namiesto {monthlyTotal} – ušetríte {saving} ročne.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/rok",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Pôvodná cena",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Potvrdzujeme vašu platbu…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Teraz máte {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message: "Obnoví sa {date} za {amount}. Potvrdenie dostanete e-mailom.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Teraz zahŕňa: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Platba bola prijatá. Váš plán sa zobrazí do minúty; obnovte stránku a skontrolujte to.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Obnoviť",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Späť na predchádzajúcu stránku",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Začnite používať {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Platba bola zrušená. Nič vám nebolo účtované.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Zobraziť fakturáciu",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Zmeniť na {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Počítame, koľko stojí táto zmena…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "Cenu tejto zmeny sa nepodarilo vypočítať. Skúste to znova.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Platí od dnes.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "Na úhradu dnes",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message: "Zahŕňa kredit {credit} za nevyužitý čas súčasného plánu.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Potom {amount}, ďalšia platba {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Strhne sa z {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "Čo získate",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Zaplatiť {amount} a zmeniť",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Pokračovať na platbu",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Teraz nie",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message: "Nevyužitý čas sa vždy započíta — nikdy neplatíte dvakrát.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "Tento plán už máte.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Tento plán si ponechávate za staršiu, nižšiu cenu; zmena by ju len zvýšila.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Váš účet má viac ako jedno aktívne predplatné. Ak chcete zmeniť plán, kontaktujte podporu.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "Nemáte aktívne predplatné, ktoré by sa dalo zmeniť. Obnovte stránku a vyberte si plán.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Posledná platba za obnovenie neprešla. Aktualizujte spôsob platby v časti Spravovať fakturáciu a potom zmeňte plán.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Začína {date}. Dovtedy si ponecháte {plan}.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Dnes nič neplatíte.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "Čo sa zmení {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Spolupracovníci na účtovnú knihu",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "AI tokeny za mesiac",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "máte {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Všetky vaše knihy zostávajú vaše a naďalej fungujú. Novú vytvoríte, až keď budete pod novým limitom {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Naplánovať zníženie",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Naplánovať zmenu",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Ponechať {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Naplánované na {date}. Dovtedy sa nič nemení.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Toto nahradí vašu naplánovanú zmenu na {plan} {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message: "Tým sa zruší aj vaša výpoveď, predplatné teda pokračuje.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message: "Vaša aktuálna cena sa už neponúka, preto touto zmenou končí.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} s mesačnou platbou môže začať pri obnovení {date}. Chcete {plan} už dnes?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "Získať {plan} dnes s ročnou platbou — teraz {amount}",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Prejsť na {plan} mesačne {date} — dnes nič",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Platí od obnovenia",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Už nie je zahrnuté",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Direktívy",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Naplánované",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "{date} sa zmení na {plan}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} končí {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Ponechať súčasný",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Váš plán zostáva taký, aký je.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "Naplánovanú zmenu sa nepodarilo vrátiť. Skúste to znova.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "Zrušiť {plan}?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "{plan} si ponecháte do {date}. Potom budete na bezplatnom pláne: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Vaše knihy sú obyčajný text — exportujte ich kedykoľvek. Nič sa nevymaže.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Ďalšie možnosti",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Prejsť na ročné — {price}/mesiac",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Znížiť na {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Aký je hlavný dôvod? (nepovinné)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Príliš drahé",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Chýba funkcia",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Nepoužívam to",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Prechádzam na iný nástroj",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Iné",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Vaša banka musí túto platbu schváliť. Dovtedy sa nič nezmení; po schválení obnovte túto stránku.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Čaká sa, kým vaša banka platbu schváli…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Schváliť platbu",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "Vaša banka platbu neschválila. Nič sa nezmenilo.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Použiť inú kartu",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Automatické zálohy",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Pokročilá automatizácia a integrácie",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Jednotné prihlásenie (SSO) cez OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Konsolidácia viacerých subjektov",
    description: "Plan feature from the pricing table",
  },
};

export default skUserSettings;
