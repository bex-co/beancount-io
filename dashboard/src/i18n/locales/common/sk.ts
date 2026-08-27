export interface TranslationEntry {
  message: string;
  description: string;
}

const skCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Účet",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Transakcie",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Späť",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Beancount logo",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Zrušiť",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Vymazať",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Zavrieť",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Limit spolupracovníkov",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Limit spolupracovníkov dosiahnutý",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Skopírované",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Kopírovať",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Vymazať",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.edit": {
    message: "Upraviť",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Narazili sme na neočakávanú chybu. Skúste to znova alebo sa vráťte na predchádzajúcu stránku.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Detaily chyby",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Nastala chyba",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Niečo sa pokazilo",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Nepodarilo sa načítať údaje",
    description: "Generic failed to load data message",
  },
  "common.failedToLoadLedger": {
    message: "Načítanie knihy zlyhalo",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Ísť späť",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Ísť domov",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Prejsť na ďalšiu stranu",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Prejsť na predchádzajúcu stranu",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Importovať",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Pridať záznam",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transakcia, zostatok alebo poznámka",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Inteligentný import",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Bankové výpisy, CSV, PDF alebo skeny",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Pripojiť banku",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Automaticky synchronizovať transakcie",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Nahrať pokladničný blok",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Skenovať bloček pomocou AI",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Neplatné parametre URL",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Poskytnuté parametre URL nie sú platné. Skontrolujte odkaz a skúste to znova.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Naposledy aktualizované",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Nastavenia knihy",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Limit kníh",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Limit kníh dosiahnutý",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "načítavanie...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Načítavam údaje...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Viac strán",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Názov",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "blízko limitu",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Pripojenie k sieti zlyhalo",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Nepodarilo sa pripojiť k serveru. Skontrolujte prosím svoje internetové pripojenie a skúste to znova.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Ďalej",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Ďalšia",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Nenašli sa žiadne údaje.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Nenašli sa žiadne výsledky.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Ostatné",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Vlastník",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Stránka nenájdená",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "Stránka, ktorú hľadáte, neexistuje alebo bola presunutá na iné miesto.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "stránkovanie",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Predchádzajúca",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Súvisiace stránky",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Uložiť",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Ukladanie...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Súvisiace stránky",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Vyberte zobrazenie",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Vyberte dátum",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Nastavenia",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Postranný panel",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Zobrazuje mobilný postranný panel.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Hviezdy",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Stav",
    description: "Label for status field",
  },
  "common.toggleSidebar": {
    message: "Prepnúť postranný panel",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Skúsiť znova",
    description: "Button text to retry action",
  },
  "common.unexpectedError": {
    message: "Pri načítavaní knihy došlo k neočakávanej chybe.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Neznámy",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "aktualizácia...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Prejsť na Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Upgradovať pre odomknutie",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "pouzivatel@priklad.sk",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Používateľ",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Stiahnuť",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Ďalšie akcie",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Viac informácií",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Zobrazenie podrobných informácií o účte pre {ledgerName}. Analyzujte transakcie, zostatky a históriu účtu.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Pýtajte sa otázky o finančných údajoch {ledgerName} pomocou AI. Analyzujte transakcie, preskúmajte zostatky účtov, pochopte trendy a získajte okamžité účtovné poznatky.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Zobrazenie súvahy pre {ledgerName}. Analyzujte aktíva, záväzky a vlastné imanie v ktoromkoľvek bode v čase.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.cashFlow": {
    message:
      "Zobrazte výkaz peňažných tokov pre {ledgerName}. Sledujte prevádzkové, investičné a finančné peňažné pohyby v čase.",
    description: "Description for cash flow page",
  },
  "common.pageDescription.commodities": {
    message:
      "Zobrazujte a spravujte komodity (meny, akcie a aktíva) používané v {ledgerName}. Sledujte výmenné kurzy a históriu cien.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Vytvorte nový súbor v {ledgerName}. Pridajte súbory knihy Beancount alebo dokumenty do svojho repozitára.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Prehliadajte dokumenty pripojené k transakciám v {ledgerName}. Zobrazujte potvrdenia, faktúry a podpornú dokumentáciu.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Zobrazenie chýb analyzovania a validácie v {ledgerName}. Opravte problémy pre zabezpečenie presných finančných správ.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Zobrazujte dôležité udalosti a míľniky v {ledgerName}. Sledujte otvorenie, zatvorenie účtov a udalosti životného cyklu.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Prehliadajte a upravujte zdrojové súbory Beancount v {ledgerName}. Spravujte svoj účtový rozvrh a históriu transakcií.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analyzujte svoje aktuálne držby a portfólio v {ledgerName}. Zobrazujte alokáciu aktív, trhové hodnoty a nerealizované zisky.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Pridajte transakcie do {ledgerName} z bankových výpisov, tabuliek alebo účteniek. Podporuje CSV, PDF, OFX a obrázky do 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Zobrazenie príjmov a výdavkov pre {ledgerName}. Sledujte príjmy, náklady a ziskovosť v čase.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Prehliadajte a filtrujte všetky transakcie v {ledgerName}. Vyhľadávajte podľa dátumu, účtu, popisu alebo príjemcu.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Finančný prehľad pre {ledgerName}. Prezrite si zostatky účtov, trendy čistého imania a súhrny príjmov/výdavkov.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Spúšťajte BQL (Beancount Query Language) dopyty na {ledgerName}. Filtrujte a analyzujte svoje finančné údaje so syntaxou podobnou SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Nakonfigurujte nastavenia pre {ledgerName}. Spravujte prevádzkové meny, spolupracovníkov a nastavenia súkromia.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Zobrazenie štatistík knihy pre {ledgerName}. Analyzujte počty transakcií, použitie účtov a metriky kvality údajov.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Zobrazenie obratovej súvahy pre {ledgerName}. Overte, že debety sa rovnajú kreditom vo všetkých účtoch.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Nahrajte súbory do {ledgerName}. Importujte existujúce súbory alebo dokumenty Beancount.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Účtovné zápisy",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Súvaha",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.cashFlow": {
    message: "Výkaz peňažných tokov",
    description: "Link label for cash flow page",
  },
  "common.relatedLinks.commodities": {
    message: "Komodity",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Vytvoriť súbor",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Dokumenty",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Chyby",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Udalosti",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Súbory",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Držby",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Importovať",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Výkaz ziskov a strát",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Denník",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Prehľad",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Dopyt",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Štatistiky",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Obratová súvaha",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Nahrať súbory",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "História verzií",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Výsledky",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Riadky",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Úspech",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Aktíva",
    description: "Label for assets section",
  },
  "component.conversionSelect.atCost": {
    message: "V obstarávacej cene",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "V trhovej hodnote",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Prehľady",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Rozšírené",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Pomoc a podpora",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Centrum pomoci",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Prezrite si návody a dokumentáciu",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Podpora komunity",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Opýtajte sa komunity na Telegrame",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "Navrhnúť funkciu",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "Zdieľajte nápady alebo nahlaste chyby na GitHube",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "Súvaha",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Vymazať všetko",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Konvertované na",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Denne",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Vlastné imanie",
    description: "Label for equity section",
  },
  "component.errorState.title": {
    message: "Chyba pri načítaní dát",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Výdavky",
    description: "Label for expenses section",
  },
  "component.searchControls.failedToLoad": {
    message: "Načítanie možností filtra zlyhalo",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Filtrovať podľa značky, príjemcu, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Podrobný rozpis {ledgerName} {sectionName} s hodnotami v USD a iných komoditách",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Zoznam {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Hierarchia {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Vizuálne znázornenie zloženia {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Príjmy",
    description: "Label for income section",
  },
  "common.cashFlow": {
    message: "Výkaz peňažných tokov",
    description: "Navigation label for cash flow financial report",
  },
  "common.incomeStatement": {
    message: "Výkaz ziskov a strát",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Pasíva",
    description: "Label for liabilities section",
  },
  "common.netProfit": {
    message: "Čistý zisk",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Čisté imanie",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Neboli nájdené žiadne účty",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Hľadať súbory...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Neboli nájdené žiadne súbory",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Žiadne údaje nie sú k dispozícii",
    description: "Empty state heading when no data exists",
  },
  "component.emptyState.noDataForFilters": {
    message: "Žiadne údaje pre vybrané filtre",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Žiadne zhody nenájdené",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Prehľad",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Skúste to znova neskôr",
    description: "Instruction to retry later after an error",
  },
  "component.intervalSelect.quarterly": {
    message: "Štvrťročne",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Hľadať účty...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Vyberte konverziu",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Vyberte časové obdobie",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Čas",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Skúšobná bilancia",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Začnite písať pre vyhľadávanie...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Jednotky",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Ročne",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Účet",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Chyba",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Relácia vypršala",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Vaša prihlasovacia relácia vypršala. Prihláste sa znova a pokračujte.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Prihláste sa, aby ste mohli pokračovať.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "Nemáte oprávnenie vykonať túto akciu.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "Požadovaný zdroj sa nenašiel.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Niektoré zadané údaje sú neplatné. Skontrolujte ich a skúste to znova.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message: "Overenie zlyhalo. Skontrolujte zadané údaje a skúste to znova.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Táto zmena je v konflikte s aktuálnym stavom. Obnovte stránku a skúste to znova.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Príliš veľa požiadaviek. Chvíľu počkajte a skúste to znova.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Na našej strane sa vyskytla chyba. Skúste to znova neskôr.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "Služba je dočasne nedostupná. Skúste to znova o chvíľu.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "Dosiahli ste limit svojho plánu. Ak chcete pokračovať, prejdite na vyšší plán.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Táto akcia nie je povolená.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Táto funkcia vyžaduje predplatné Premium.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Problém s pripojením. Skontrolujte internetové pripojenie a skúste to znova.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Niečo sa pokazilo. Skúste to znova.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Niečo sa pokazilo",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "Túto sekciu sa nepodarilo zobraziť. Zvyšok stránky by mal fungovať.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Kopírovať kód",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Skopírované do schránky",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Kopírovanie zlyhalo",
    description: "Toast when copying to the clipboard failed",
  },
  "common.outOfDateRefresh": {
    message: "Neaktuálne – kliknutím obnovíte",
    description: "Tooltip for refreshing a stale ledger",
  },
  "common.view": {
    message: "Zobraziť",
    description: "Accessible label for a view selector",
  },
  "common.today": {
    message: "Dnes",
    description: "Button that selects today's date",
  },
  "common.author": {
    message: "Autor",
    description: "Label for an author",
  },
  "common.from": {
    message: "Od",
    description: "Label for a source branch or account",
  },
  "common.to": {
    message: "Komu",
    description: "Label for a destination branch or account",
  },
  "common.option": {
    message: "Možnosť",
    description: "Table heading for an option name",
  },
  "common.value": {
    message: "Hodnota",
    description: "Table heading for an option value",
  },
  "common.moreCount": {
    message: "+{count} ďalších",
    description: "Count of additional hidden items",
  },
  "common.hideCharts": {
    message: "Skryť grafy",
    description: "Accessible label for hiding report charts",
  },
  "common.showCharts": {
    message: "Zobraziť grafy",
    description: "Accessible label for showing report charts",
  },
  "common.redirecting": {
    message: "Presmerovanie...",
    description: "Status while redirecting to another page",
  },
  "common.loadingLedger": {
    message: "Načítava sa vaša účtovná kniha",
    description: "Status while loading a ledger",
  },
  "component.combobox.useCustomValue": {
    message: "Stlačením klávesu Enter použijete „{value}“",
    description: "Hint for accepting a custom combobox value",
  },
};

export default skCommon;
