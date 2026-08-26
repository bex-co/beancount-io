import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Exportieren",
  markdown: "Markdown-Bericht",
  csv: "CSV-Tabelle",
  printSavePdf: "Drucken / Als PDF speichern",
  completed: "Der Berichtsexport ist bereit.",
  failed: "Der Bericht konnte nicht exportiert werden.",
  context: "Umfang und Grundlage",
  generatedAt: "Erstellt am {generatedAt}",
  asOf: "Stand",
  period: "Für den Zeitraum",
  accountFilter: "Kontofilter",
  advancedFilter: "Erweiterter Filter",
  interval: "Intervall",
  conversion: "Umrechnung",
  notApplied: "Nicht angewendet",
  currency: "Währung",
  unit: "Einheit",
  amount: "Betrag",
  unauditedManagementReport: "Ungeprüfter Managementbericht",
  unauditedMultiUnitManagementReport:
    "Ungeprüfte Managementaufstellung mit mehreren Einheiten",
  unauditedInternalDraft: "Ungeprüfter interner Entwurf",
  statementSummary: "Berichtsübersicht",
  lineItem: "Posten",
  totalAssets: "Summe Aktiva",
  totalLiabilities: "Summe Verbindlichkeiten",
  totalEquity: "Summe Eigenkapital",
  totalLiabilitiesAndEquity: "Summe Verbindlichkeiten und Eigenkapital",
  reconciliationDifference: "Abstimmungsdifferenz",
  totalRevenue: "Gesamterlöse und sonstige Erträge",
  totalExpenses: "Gesamtaufwendungen",
  netLoss: "Nettoverlust",
  netCashOperating: "Netto-Cashflow aus betrieblicher Tätigkeit",
  netCashInvesting: "Netto-Cashflow aus Investitionstätigkeit",
  netCashFinancing: "Netto-Cashflow aus Finanzierungstätigkeit",
  netChangeInCash: "Nettoveränderung der Zahlungsmittel und -äquivalente",
  openingCash: "Zahlungsmittel und -äquivalente zu Periodenbeginn",
  closingCash: "Zahlungsmittel und -äquivalente zu Periodenende",
  supportingAccountDetail: "Ergänzende Kontendetails",
  allActivity: "Alle verfügbaren Buchungsaktivitäten bis",
  dateUnavailable: "Berichtsdatum nicht verfügbar",
  presentationCurrency: "Darstellungswährung",
  ledgerUnits: "Dargestellte Bucheinheiten",
  sourceLedger: "Quellbuch",
  importantNotices: "Wichtige Hinweise",
  reportingEntity: "Berichtendes Unternehmen",
  netIncome: "Nettoergebnis",
  reportingEntityFallbackNotice:
    'Es ist kein berichtendes Unternehmen konfiguriert. Der Name des Quellbuchs wird verwendet; setzen Sie vor externer Verwendung die Beancount-option "title".',
  placeholderDataNotice:
    "Das berichtende Unternehmen oder Quellbuch scheint Beispieldaten zu enthalten. Ersetzen Sie diese vor externer Verwendung.",
  inferredPeriodNotice:
    "Dieser Bericht umfasst Buchungsaktivitäten vom {startDate} bis zum {endDate}. Die Daten wurden aus den verfügbaren Berichtsdaten abgeleitet.",
  periodNotExplicitNotice:
    "Ein vollständiger Berichtszeitraum konnte nicht bestimmt werden. Dieser Bericht bleibt ein interner Entwurf.",
  inferredAsOfDateNotice:
    "Es wurde kein ausdrücklicher Stichtag gewählt. Dieser Abschluss verwendet das letzte im Bericht verfügbare Datum: {asOfDate}.",
  asOfDateUnavailableNotice:
    "Ein Bilanzstichtag konnte nicht bestimmt werden. Dieser Abschluss bleibt ein interner Entwurf.",
  subtotalRowsNotice:
    "Fett gedruckte Zeilen sind Zwischen- oder Gesamtsummen und dürfen nicht zu den zugehörigen Detailzeilen addiert werden.",
  partialReportNotice:
    "Konto- oder erweiterte Filter begrenzen diesen Bericht; er ist kein vollständiger Abschluss.",
  balanceSheetClassificationNotice:
    "Die Quelldaten enthalten keine Gliederung in kurz- und langfristige Posten; Konten werden in der Reihenfolge des Ledgers dargestellt.",
  balanceSheetDoesNotReconcileNotice:
    "Die Bilanzgleichung stimmt für mindestens eine Einheit nicht überein. Prüfen Sie vor externer Verwendung nicht abgeschlossene Ergebnisse, Teilfilter, Bewertungs- oder Umrechnungseffekte und Ledgerfehler. Dieser Abschluss bleibt ein interner Entwurf.",
  cashFlowClassificationNotice:
    "Die Einteilung in betriebliche, Investitions- und Finanzierungstätigkeit wird für Konten ohne deklarierte cash-flow-role aus Kontentypen und -namen abgeleitet; Konten mit einer Deklaration werden wie angegeben eingestuft.",
  cashFlowCashEquivalentsNotice:
    "Der Bestand an Zahlungsmitteln und -äquivalenten wird aus Kontonamen abgeleitet (Giro-, Spar- und kasseähnliche Konten). Prüfen Sie die einbezogenen Konten vor externer Verwendung.",
  customUnitsNotice: "Zu prüfende benutzerdefinierte Bucheinheiten:",
  customUnitsDefinitionNotice:
    "Ihre Bedeutung ist in diesem Export nicht verfügbar; dokumentieren Sie sie vor externer Verwendung in einer Begleitnotiz.",
  multiUnitScheduleNotice:
    "Dieser Bericht mit mehreren Einheiten ist eine Managementaufstellung und kein Abschluss in einer einzigen Darstellungswährung. Beträge verschiedener Einheiten dürfen nicht addiert werden; wählen Sie vor externer Verwendung eine Darstellungswährung.",
  noAssurance:
    "Es wird keine Sicherheit geboten. Der Bericht basiert auf vom Benutzer bereitgestellten Buchungen; Identität, Vollständigkeit, Bewertung und Rechnungslegungskonformität wurden nicht geprüft.",
  generatedBy: "Erstellt von Beancount.io am {generatedAt}",
});
