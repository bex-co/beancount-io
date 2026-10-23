export interface TranslationEntry {
  message: string;
  description: string;
}

const skDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Vytvoriť knihu",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Vytvoriť novú knihu",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Vytvorte si novú Beancount knihu a začnite spravovať svoje financie.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Dashboard",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Prejsť na dashboard",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Vymazať knihu",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Ste si istí, že chcete vymazať "{name}"? Túto akciu nie je možné vrátiť späť.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Vymazávam...",
    description: "Button text while deleting account",
  },
  "page.dashboard.descriptionOptional": {
    message: "Popis (Voliteľné)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Upraviť knihu",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Upraviť nastavenia knihy",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Zadajte popis",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Zadajte názov knihy",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Načítanie kníh zlyhalo",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Nepodarilo sa načítať kanál",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Kniha bola úspešne vytvorená",
    description: "Success message when ledger is created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Kniha bola úspešne vymazaná",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Dosiahli ste limit hlavných kníh. Inovujte, aby ste mohli vytvoriť viac kníh.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Názov knihy",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Nastavenia pre {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Kniha bola úspešne aktualizovaná",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Načítavam knihy...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Spravujte svoje Beancount knihy",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Použite aspoň jedno latinské písmeno (A–Z) alebo číslicu: názov sa stane webovou adresou knihy.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Názov musí mať menej ako 100 znakov",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Názov je povinný",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Osobná kniha",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "Zaznamenajte nákup a pochopte jeho vplyv na zostávajúce peniaze.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Kniha na voľnej nohe",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Zaznamenajte príjmy od zákazníkov alebo zistite, koľko dlží nezaplatený zákazník.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Firemná kniha",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message: "Vytvorte otváraciu pozíciu a odlíšte financovanie od výnosov.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Portfóliová kniha",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Zaznamenajte nákup a overte jednotky, záznamy o nadobudnutí a pohyb peňazí.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Kniha nájmu",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "Zaznamenajte príjmy a odlíšte nájom od vratnej zálohy.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Kniha spoločných výdavkov",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Zaznamenajte preddavok a pozrite, kto komu dlží.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Kniha komunity",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message:
      "Vysvetlite príspevky, projektové výdavky a zostávajúce prostriedky.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Prázdna kniha",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Pridajte zvolenú štruktúru bez odstraňovania nechcených kategórií.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Zadajte sumu ako 100 alebo -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Prevádzková mena",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Knihy začínajú dňa",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Otvárací účet",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Počiatočný zostatok (voliteľné)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Rozhodnúť neskôr",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Kontrola",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "Presne toto sa vytvorí. Vráťte sa, ak chcete niečo zmeniť.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Účty",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Krok {step} z {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Žiadne knihy neboli nájdené",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message: "Vytvorte si prvú knihu a začnite sledovať svoje financie.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Súkromné",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Prístup majú len vy a spolupracovníci",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Verejné",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Ktokoľvek s odkazom môže vidieť vaše finančné údaje",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Názov repozitára",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Opakovať",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Hľadať knihy...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Vybrať knihu",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — prepnúť knihu",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Zobraziť Viac",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Aktualizujte podrobnosti vašej knihy.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Vaše knihy",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Prejsť na účet {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Aktivita",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Zmeny vo vašich knihách sa zobrazia tu.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Zmeny vo všetkých knihách, ktoré vidíte",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "Aktivitu sa nepodarilo obnoviť. Zobrazuje sa skôr načítaná aktivita.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default skDashboardPage;
