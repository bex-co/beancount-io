export interface TranslationEntry {
  message: string;
  description: string;
}

const caCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Compte",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Transaccions",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Enrere",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Logotip de Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Cancel·lar",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Esborrar",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Tancar",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Límit de col·laboradors",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Límit de col·laboradors assolit",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Copiat",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Copiar",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Eliminar",
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
    message: "Editar",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Hem trobat un error inesperat. Si us plau, torneu-ho a provar o torneu a la pàgina anterior.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Detalls de l'error",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "S'ha produït un error",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Alguna cosa ha anat malament",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Error en carregar les dades",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Error en carregar el llibre",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Tornar enrere",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Anar a l'inici",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Anar a la pàgina següent",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Anar a la pàgina anterior",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Importar",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Afegir entrada",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transacció, saldo o nota",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Importació intel·ligent",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Extractes bancaris, CSV, PDF o escanejats",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Connectar banc",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Sincronitzar transaccions automàticament",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Pujar rebut",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Escaneja el rebut amb IA",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Paràmetres d'URL no vàlids",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Els paràmetres d'URL proporcionats no són vàlids. Si us plau, comproveu l'enllaç i torneu-ho a provar.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Darrera actualització",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Configuració del llibre",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Límit de registres",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Límit de registres assolit",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "carregant...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Carregant dades...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Més pàgines",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Nom",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "prop del límit",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Error de connexió de xarxa",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "No es pot connectar amb el servidor. Si us plau, comproveu la connexió a internet i torneu-ho a intentar.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Següent",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Següent",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "No s'han trobat dades.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "No s'han trobat resultats.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Altres",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Propietari",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Pàgina no trobada",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "La pàgina que cerqueu no existeix o s'ha mogut a una ubicació diferent.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "paginació",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Anterior",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Pàgines relacionades",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Guardar",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Guardant...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Pàgines relacionades",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Seleccionar una vista",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Seleccionar data",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Configuració",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Barra lateral",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Mostra la barra lateral mòbil.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Estrelles",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Estat",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Alternar barra lateral",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Tornar a intentar",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "S'ha produït un error inesperat en carregar el llibre.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Desconegut",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "actualitzant...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Actualitza a Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Actualitza per desbloquejar",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "usuari@exemple.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Usuari",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Descarregar",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Més accions",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Més informació",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Vista de detalls del compte per a {ledgerName}. Analitzeu transaccions, saldos i historial del compte.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Fes preguntes sobre les dades financeres de {ledgerName} utilitzant IA. Analitza transaccions, explora saldos de comptes, comprèn tendències i obtén informació comptable instantània.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Vista del balanç per a {ledgerName}. Analitzeu actius, passius i patrimoni en qualsevol moment.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "Visualitzeu i gestioneu mercaderies (divises, accions i actius) utilitzades a {ledgerName}. Seguiu tipus de canvi i històric de preus.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Creeu un nou fitxer a {ledgerName}. Afegiu fitxers del llibre major de Beancount o documents al vostre repositori.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Visualitzeu documents adjunts a transaccions a {ledgerName}. Reviseu rebuts, factures i documentació de suport.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Vista d'errors d'anàlisi i validació a {ledgerName}. Solucioneu problemes per garantir informes financers precisos.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Visualitzeu esdeveniments i fites importants a {ledgerName}. Seguiu obertures i tancaments de comptes i esdeveniments del cicle de vida.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Visualitzeu i editeu fitxers font de Beancount a {ledgerName}. Gestioneu el vostre pla de comptes i l'historial de transaccions.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analitzeu les vostres participacions actuals i cartera a {ledgerName}. Visualitzeu l'assignació d'actius, valors de mercat i guanys no realitzats.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Afegiu transaccions a {ledgerName} des d'extractes bancaris, fulls de càlcul o rebuts. Compatible amb CSV, PDF, OFX i imatges fins a 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Vista d'ingressos i despeses per a {ledgerName}. Seguiu ingressos, despeses i rendibilitat al llarg del temps.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Visualitzeu i filtreu totes les transaccions a {ledgerName}. Cerqueu per data, compte, descripció o beneficiari.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Tauler financer per a {ledgerName}. Reviseu saldos de comptes, tendències de patrimoni net i resums d'ingressos/despeses.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Executeu consultes BQL (Beancount Query Language) contra {ledgerName}. Filtreu i analitzeu les vostres dades financeres amb sintaxi similar a SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Configureu paràmetres per a {ledgerName}. Gestioneu divises operatives, col·laboradors i configuració de privadesa.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Vista d'estadístiques del llibre major per a {ledgerName}. Analitzeu recomptes de transaccions, ús de comptes i mètriques de qualitat de dades.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Vista del balanç de comprovació per a {ledgerName}. Verifiqueu dèbits i crèdits en tots els comptes.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Pengeu fitxers a {ledgerName}. Importeu fitxers o documents de Beancount existents.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Assentaments",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Balanç",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.commodities": {
    message: "Mercaderies",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Crear fitxer",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Documents",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Errors",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Esdeveniments",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Fitxers",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Participacions",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Importar",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Compte de resultats",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Diari",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Resum",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Consulta",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Estadístiques",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Balanç de comprovació",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Carregar fitxers",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "Historial de versions",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Resultats",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Files",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Correcte",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Actius",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "Representació visual de la composició dels {ledgerName} actius",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "A cost",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Informes",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Avançat",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Ajuda i assistència",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Centre d'ajuda",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Consulta guies i documentació",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Assistència de la comunitat",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Pregunta a la comunitat a Telegram",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "Sol·licita una funció",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "Comparteix idees o informa d'errors a GitHub",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "A valor de mercat",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Veure els canvis del compte al llarg del temps",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Esborrar tot",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Convertit a",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Patrimoni net",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Error en carregar les dades del compte",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Despeses",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Error en carregar els comptes",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message:
      "Error en carregar la informació general del llibre. Si us plau, torneu-ho a intentar més tard.",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Desglossament detallat de {ledgerName} {sectionName} amb valors en USD i altres matèries primeres",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Llista {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Jerarquia {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message:
      "Representació visual de la composició de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Ingressos",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message:
      "Representació visual de la composició dels {ledgerName} ingressos",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Passius",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Carregant les dades generals...",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message:
      "Seguir el {ledgerName} benefici net en diferents monedes al llarg del temps",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "No s'han trobat dades del compte per a aquest compte.",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Cerca fitxers...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "No s'han trobat fitxers",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message:
      "No s'han trobat dades del balanç de situació per a aquest llibre.",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "No hi ha dades per als filtres seleccionats",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "No s'han trobat entrades de diari per a aquest compte.",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message:
      "No s'han trobat dades del balanç de comprovació per a aquest llibre.",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Resum general",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Si us plau, torneu-ho a intentar més tard",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Error de consulta",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Cercar comptes...",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Seleccionar conversió",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Seleccionar període de temps",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Temps",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message:
      "Visió general completa de tots els comptes amb els seus balanços a través de tots els tipus de compte",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Unitats",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Anual",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Compte",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Error",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Sessió Caducada",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "La teva sessió d'inici ha caducat. Torna a iniciar sessió per continuar.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Inicieu la sessió per continuar.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "No teniu permís per fer aquesta acció.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "No s'ha trobat el recurs sol·licitat.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Part de la informació proporcionada no és vàlida. Reviseu-la i torneu-ho a provar.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message: "La validació ha fallat. Reviseu les dades i torneu-ho a provar.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Aquest canvi entra en conflicte amb l'estat actual. Actualitzeu la pàgina i torneu-ho a provar.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Massa sol·licituds. Espereu un moment i torneu-ho a provar.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message:
      "Alguna cosa ha fallat per part nostra. Torneu-ho a provar més tard.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message:
      "El servei no està disponible temporalment. Torneu-ho a provar d'aquí a poc.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "Heu arribat al límit del vostre pla. Milloreu el pla per continuar.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Aquesta acció no està permesa.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Aquesta funció requereix una subscripció Premium.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Problema de connexió. Comproveu la connexió a internet i torneu-ho a provar.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Alguna cosa ha fallat. Torneu-ho a provar.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Alguna cosa ha fallat",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "No s'ha pogut mostrar aquesta secció. La resta de la pàgina hauria de continuar funcionant.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Copia el codi",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "S'ha copiat al porta-retalls",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "No s'ha pogut copiar",
    description: "Toast when copying to the clipboard failed",
  },
};

export default caCommon;
