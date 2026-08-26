export interface TranslationEntry {
  message: string;
  description: string;
}

const nlCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Rekening",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Transacties",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Terug",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Beancount Logo",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Annuleren",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Wissen",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Sluiten",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Medewerkers limiet",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Medewerkers limiet bereikt",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Gekopieerd",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Kopiëren",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Verwijderen",
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
    message: "Bewerken",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "We hebben een onverwachte fout aangetroffen. Probeer het opnieuw of ga terug naar de vorige pagina.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Foutdetails",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Er is een fout opgetreden",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Er is iets misgegaan",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Laden van gegevens mislukt",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Laden van grootboek mislukt",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Ga terug",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Ga naar home",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Ga naar volgende pagina",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Ga naar vorige pagina",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Importeren",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Item toevoegen",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transactie, saldo of notitie",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Slim importeren",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Bankafschriften, CSV, PDF of scans",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Bank verbinden",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Transacties automatisch synchroniseren",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Bon uploaden",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Bon scannen met AI",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Ongeldige URL-parameters",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "De opgegeven URL-parameters zijn niet geldig. Controleer de link en probeer het opnieuw.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Laatst bijgewerkt",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Grootboekinstellingen",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Grootboek limiet",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Grootboek limiet bereikt",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "laden...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Gegevens laden...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Meer pagina's",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Naam",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "bijna aan de limiet",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Netwerkverbinding mislukt",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Kan geen verbinding maken met de server. Controleer uw internetverbinding en probeer het opnieuw.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Volgende",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Volgende",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Geen gegevens gevonden.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Geen resultaten gevonden.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Overige",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Eigenaar",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Pagina niet gevonden",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "De pagina die u zoekt bestaat niet of is verplaatst naar een andere locatie.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "paginering",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Vorige",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Gerelateerde pagina's",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Opslaan",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Opslaan...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Gerelateerde pagina's",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Selecteer een weergave",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Selecteer datum",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Instellingen",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Zijbalk",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Toont de mobiele zijbalk.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Sterren",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Status",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Zijbalk schakelen",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Probeer opnieuw",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message:
      "Er is een onverwachte fout opgetreden bij het laden van het grootboek.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Onbekend",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "bijwerken...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Upgraden naar Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Upgrade om te ontgrendelen",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "gebruiker@voorbeeld.nl",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Gebruiker",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Downloaden",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Meer acties",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Meer informatie",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Rekeningdetailweergave voor {ledgerName}. Analyseer transacties, saldi en rekeninggeschiedenis.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Stel vragen over de financiële gegevens van {ledgerName} met AI. Analyseer transacties, verken rekeningsaldi, begrijp trends en krijg directe boekhoudkundige inzichten.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Balansweergave voor {ledgerName}. Analyseer activa, passiva en eigen vermogen op elk moment.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.cashFlow": {
    message:
      "Bekijk het kasstroomoverzicht voor {ledgerName}. Volg operationele, investerings- en financieringskasstromen in de loop van de tijd.",
    description: "Description for cash flow page",
  },
  "common.pageDescription.commodities": {
    message:
      "Bekijk en beheer goederen (valuta's, aandelen en activa) die worden gebruikt in {ledgerName}. Volg wisselkoersen en prijsgeschiedenis.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Maak een nieuw bestand aan in {ledgerName}. Voeg Beancount-grootboekbestanden of documenten toe aan uw repository.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Bekijk documenten die zijn bijgevoegd bij transacties in {ledgerName}. Bekijk bonnetjes, facturen en ondersteunende documentatie.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Weergave van parse- en validatiefouten in {ledgerName}. Los problemen op om nauwkeurige financiële rapporten te garanderen.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Bekijk belangrijke gebeurtenissen en mijlpalen in {ledgerName}. Volg het openen en sluiten van rekeningen en levenscyclusgebeurtenissen.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Bekijk en bewerk Beancount-bronbestanden in {ledgerName}. Beheer uw rekeningschema en transactiegeschiedenis.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analyseer uw huidige bezittingen en portefeuille in {ledgerName}. Bekijk activaspreiding, marktwaarden en niet-gerealiseerde winsten.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Voeg transacties toe aan {ledgerName} vanuit bankafschriften, spreadsheets of bonnetjes. Ondersteunt CSV, PDF, OFX en afbeeldingen tot 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Weergave van inkomsten en uitgaven voor {ledgerName}. Volg inkomsten, uitgaven en winstgevendheid in de tijd.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Bekijk en filter alle transacties in {ledgerName}. Zoek op datum, rekening, beschrijving of begunstigde.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Financieel dashboard voor {ledgerName}. Bekijk rekeningsaldi, trends in nettovermogen en samenvattingen van inkomsten/uitgaven.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Voer BQL (Beancount Query Language) query's uit tegen {ledgerName}. Filter en analyseer uw financiële gegevens met SQL-achtige syntaxis.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Configureer instellingen voor {ledgerName}. Beheer operationele valuta's, medewerkers en privacyinstellingen.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Weergave van grootboekstatistieken voor {ledgerName}. Analyseer transactieaantallen, rekeninggebruik en gegevenskwaliteitsmetrics.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Proefbalansweergave voor {ledgerName}. Controleer debet en credit in alle rekeningen.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Upload bestanden naar {ledgerName}. Importeer bestaande Beancount-bestanden of -documenten.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Rekeningposten",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Balans",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.cashFlow": {
    message: "Kasstroomoverzicht",
    description: "Link label for cash flow page",
  },
  "common.relatedLinks.commodities": {
    message: "Goederen",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Bestand aanmaken",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Documenten",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Fouten",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Gebeurtenissen",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Bestanden",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Bezittingen",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Importeren",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Winst-en-verliesrekening",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Dagboek",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Overzicht",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Query",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Statistieken",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Proefbalans",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Bestanden uploaden",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "Versiegeschiedenis",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Resultaten",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Rijen",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Succes",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Activa",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "Tegen kostprijs",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "Tegen marktwaarde",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Rapporten",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Geavanceerd",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Hulp en ondersteuning",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Helpcentrum",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Bekijk handleidingen en documentatie",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Communityondersteuning",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Stel je vraag aan de community op Telegram",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "Functie aanvragen",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "Deel ideeën of meld bugs op GitHub",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "Balans",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Wissen all",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Geconverteerd naar",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Dagelijks",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Eigen vermogen",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Fout bij laden gegevens",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Uitgaven",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Filteropties laden mislukt",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Filteren op tag, begunstigde, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Gedetailleerde uitsplitsing van {ledgerName} {sectionName} met USD- en andere grondstofwaarden",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} Lijst",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName} Hiërarchie",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Visuele weergave van {ledgerName} {sectionName} samenstelling",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Inkomsten",
    description: "Income category in accounting",
  },
  "common.cashFlow": {
    message: "Kasstroomoverzicht",
    description: "Navigation label for cash flow financial report",
  },
  "common.incomeStatement": {
    message: "Winst- en verliesrekening",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Passiva",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Nettowinst",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Netto vermogen",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Geen rekeningen gevonden",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Bestanden zoeken...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Geen bestanden gevonden",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Geen gegevens beschikbaar",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "Geen gegevens voor geselecteerde filters",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Geen overeenkomsten gevonden",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Overzicht",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Probeer het later opnieuw",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Driemaandelijks",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Rekeningen zoeken...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Selecteer conversie",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Selecteer tijdsperiode",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Tijd",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Proefbalans",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Typ om te zoeken...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Eenheden",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Jaarlijks",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Rekening",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Fout",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Sessie Verlopen",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message: "Uw inlogsessie is verlopen. Log opnieuw in om door te gaan.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Log in om door te gaan.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "Je hebt geen toestemming om deze actie uit te voeren.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "De opgevraagde resource is niet gevonden.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Sommige ingevoerde gegevens zijn ongeldig. Controleer ze en probeer het opnieuw.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message: "Validatie mislukt. Controleer je invoer en probeer het opnieuw.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Deze wijziging conflicteert met de huidige status. Vernieuw de pagina en probeer het opnieuw.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Te veel verzoeken. Wacht even en probeer het opnieuw.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Er is iets misgegaan aan onze kant. Probeer het later opnieuw.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "De service is tijdelijk niet beschikbaar. Probeer het zo weer.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "Je hebt de limiet van je abonnement bereikt. Upgrade om door te gaan.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Deze actie is niet toegestaan.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Deze functie vereist een Premium-abonnement.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Verbindingsprobleem. Controleer je internetverbinding en probeer het opnieuw.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Er is iets misgegaan. Probeer het opnieuw.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Er is iets misgegaan",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "Deze sectie kon niet worden weergegeven. De rest van de pagina zou moeten blijven werken.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Code kopiëren",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Gekopieerd naar het klembord",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Kopiëren mislukt",
    description: "Toast when copying to the clipboard failed",
  },
};

export default nlCommon;
