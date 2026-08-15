export interface TranslationEntry {
  message: string;
  description: string;
}

const deCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Konto",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Transaktionen",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Zurück",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Beancount Logo",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Abbrechen",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Löschen",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Schließen",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Mitarbeiter-Limit",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Mitarbeiter-Limit erreicht",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Kopiert",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Kopieren",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Löschen",
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
    message: "Bearbeiten",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Wir sind auf einen unerwarteten Fehler gestoßen. Bitte versuchen Sie es erneut oder kehren Sie zur vorherigen Seite zurück.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Fehlerdetails",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Ein Fehler ist aufgetreten",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Etwas ist schiefgelaufen",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Laden der Daten fehlgeschlagen",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Laden des Hauptbuchs fehlgeschlagen",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Zurück",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Zur Startseite",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Zur nächsten Seite",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Zur vorherigen Seite",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Importieren",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Eintrag hinzufügen",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transaktion, Saldo oder Notiz",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Intelligenter Import",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Kontoauszüge, CSV, PDF oder Scans",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Bank verbinden",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Transaktionen automatisch synchronisieren",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Beleg hochladen",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Belege per KI scannen",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Ungültige URL-Parameter",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Die bereitgestellten URL-Parameter sind nicht gültig. Bitte überprüfen Sie den Link und versuchen Sie es erneut.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Zuletzt aktualisiert",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Hauptbuch-Einstellungen",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Hauptbuch-Limit",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Hauptbuch-Limit erreicht",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "laden...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Daten werden geladen...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Weitere Seiten",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Name",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "nahe am Limit",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Netzwerkverbindung fehlgeschlagen",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Verbindung zum Server nicht möglich. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Weiter",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Weiter",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Keine Daten gefunden.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Keine Ergebnisse gefunden.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Sonstige",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Eigentümer",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Seite nicht gefunden",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "Die gesuchte Seite existiert nicht oder wurde an einen anderen Ort verschoben.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "Paginierung",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Vorherige",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Verwandte Seiten",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Speichern",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Speichern...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Verwandte Seiten",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Ansicht wählen",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Datum auswählen",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Einstellungen",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Seitenleiste",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Zeigt die mobile Seitenleiste an.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Sterne",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Status",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Seitenleiste umschalten",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Erneut versuchen",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message:
      "Beim Laden des Hauptbuchs ist ein unerwarteter Fehler aufgetreten.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Unbekannt",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "aktualisiere...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Auf Pro upgraden",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Upgraden zum Freischalten",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "benutzer@beispiel.de",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Benutzer",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Herunterladen",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Weitere Aktionen",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Mehr erfahren",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Kontodetailansicht für {ledgerName}. Analysieren Sie Transaktionen, Salden und Kontohistorie.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Stellen Sie Fragen zu den Finanzdaten von {ledgerName} mit KI. Analysieren Sie Transaktionen, erkunden Sie Kontosalden, verstehen Sie Trends und erhalten Sie sofortige Buchhaltungseinblicke.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Bilanzansicht für {ledgerName}. Analysieren Sie Vermögenswerte, Verbindlichkeiten und Eigenkapital zu jedem Zeitpunkt.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "Waren (Währungen, Aktien und Vermögenswerte) in {ledgerName} anzeigen und verwalten. Verfolgen Sie Wechselkurse und Preisentwicklung.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Neue Datei in {ledgerName} erstellen. Fügen Sie Beancount-Hauptbuchdateien oder Dokumente zu Ihrem Repository hinzu.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Dokumente anzeigen, die an Transaktionen in {ledgerName} angehängt sind. Überprüfen Sie Belege, Rechnungen und Begleitdokumentation.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Parse- und Validierungsfehler in {ledgerName} anzeigen. Beheben Sie Probleme, um genaue Finanzberichte sicherzustellen.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Wichtige Ereignisse und Meilensteine in {ledgerName} anzeigen. Verfolgen Sie Kontoeröffnungen, -schließungen und Lebenszyklus-Ereignisse.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Beancount-Quelldateien in {ledgerName} anzeigen und bearbeiten. Verwalten Sie Ihren Kontenplan und Ihre Transaktionshistorie.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analysieren Sie Ihre aktuellen Bestände und Ihr Portfolio in {ledgerName}. Zeigen Sie Vermögensaufteilung, Marktwerte und nicht realisierte Gewinne an.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Transaktionen zu {ledgerName} aus Kontoauszügen, Tabellen oder Belegen hinzufügen. Unterstützt CSV, PDF, OFX und Bilddateien bis 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Einnahmen- und Ausgabenansicht für {ledgerName}. Verfolgen Sie Einnahmen, Ausgaben und Rentabilität im Zeitverlauf.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Alle Transaktionen in {ledgerName} anzeigen und filtern. Suchen Sie nach Datum, Konto, Beschreibung oder Zahlungsempfänger.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Finanz-Dashboard für {ledgerName}. Überprüfen Sie Kontostände, Vermögensentwicklung und Einnahmen-/Ausgabenzusammenfassungen.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "BQL (Beancount Query Language)-Abfragen gegen {ledgerName} ausführen. Filtern und analysieren Sie Ihre Finanzdaten mit SQL-ähnlicher Syntax.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Einstellungen für {ledgerName} konfigurieren. Verwalten Sie Betriebswährungen, Mitarbeiter und Datenschutzeinstellungen.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Hauptbuchstatistiken für {ledgerName} anzeigen. Analysieren Sie Transaktionszahlen, Kontonutzung und Datenqualitätsmetriken.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Probebilanzansicht für {ledgerName}. Überprüfen Sie Soll und Haben in allen Konten.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Dateien in {ledgerName} hochladen. Importieren Sie vorhandene Beancount-Dateien oder -Dokumente.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Buchungen",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Bilanz",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.commodities": {
    message: "Waren",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Datei erstellen",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Dokumente",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Fehler",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Ereignisse",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Dateien",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Bestände",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Importieren",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Gewinn- und Verlustrechnung",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Journal",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Übersicht",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Abfrage",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Statistiken",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Probebilanz",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Dateien hochladen",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "Versionsverlauf",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Ergebnisse",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Zeilen",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Erfolg",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Vermögen",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "Zu Anschaffungskosten",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "Zum Marktwert",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Berichte",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Erweitert",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Hilfe und Support",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Hilfe-Center",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Anleitungen und Dokumentation durchsuchen",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Community-Support",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Fragen Sie die Community auf Telegram",
    description: "Description for the community support menu item",
  },
  "common.balanceSheet": {
    message: "Bilanz",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Alle löschen",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Umgerechnet in",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Täglich",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Eigenkapital",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Fehler beim Laden der Daten",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Aufwendungen",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Filteroptionen konnten nicht geladen werden",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Nach Tag, Zahlungsempfänger filtern...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Detaillierte Aufschlüsselung {ledgerName} {sectionName} mit USD- und anderen Rohstoffwerten",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} Liste",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName} Hierarchie",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Visuelle Darstellung {ledgerName} {sectionName}-Zusammensetzung",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Erträge",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "Gewinn- und Verlustrechnung",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Verbindlichkeiten",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Nettogewinn",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Nettowert",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Keine Konten gefunden",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Dateien suchen...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Keine Dateien gefunden",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Keine Daten verfügbar",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "Keine Daten für ausgewählte Filter",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Keine Übereinstimmungen gefunden",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Übersicht",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Bitte versuchen Sie es später erneut",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Vierteljährlich",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Konten suchen...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Umrechnung auswählen",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Zeitraum auswählen",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Zeit",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Saldenbilanz",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Zum Suchen eingeben...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Einheiten",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Jährlich",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Konto",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Fehler",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Sitzung abgelaufen",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Ihre Anmeldesitzung ist abgelaufen. Bitte melden Sie sich erneut an, um fortzufahren.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Bitte melden Sie sich an, um fortzufahren.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "Sie haben keine Berechtigung für diese Aktion.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "Die angeforderte Ressource wurde nicht gefunden.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Einige Angaben sind ungültig. Bitte überprüfen Sie sie und versuchen Sie es erneut.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "Die Validierung ist fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Diese Änderung steht im Konflikt mit dem aktuellen Stand. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message:
      "Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message:
      "Bei uns ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message:
      "Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es in Kürze erneut.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "Sie haben das Limit Ihres Tarifs erreicht. Führen Sie ein Upgrade durch, um fortzufahren.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Diese Aktion ist nicht erlaubt.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Diese Funktion erfordert ein Premium-Abonnement.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Verbindungsproblem. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Etwas ist schiefgelaufen",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "Dieser Bereich konnte nicht angezeigt werden. Der Rest der Seite sollte weiterhin funktionieren.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Code kopieren",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "In die Zwischenablage kopiert",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Kopieren fehlgeschlagen",
    description: "Toast when copying to the clipboard failed",
  },
};

export default deCommon;
