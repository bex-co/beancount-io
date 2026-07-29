export interface TranslationEntry {
  message: string;
  description: string;
}

const deImporter: Record<string, TranslationEntry> = {
  // Premium Banner
  "importer.premiumBannerTitle": {
    message: "Smart Import ist verfügbar — Kostenloser früher Zugang",
    description: "Title for premium feature banner",
  },
  "importer.premiumBannerDismiss": {
    message: "Banner schließen",
    description: "Aria label for dismiss banner button",
  },
  "importer.premiumBannerDescription": {
    message:
      "Importieren Sie Kontoauszüge aus PDFs, OFX-Dateien und Bildern in Sekunden mit KI-gestützter Analyse. Für begrenzte Zeit kostenlos.",
    description: "Description of premium importer features",
  },

  // File Upload
  "importer.upload.title": {
    message: "Datei hochladen",
    description: "Title for file upload card",
  },
  "importer.upload.description": {
    message:
      "Laden Sie Ihren Kontoauszug oder Ihre Transaktionsdatei hoch. Unterstützte Formate: CSV, PDF, OFX oder Bilder (PNG/JPG). Maximal 10MB.",
    description: "Description of supported file formats and size limit",
  },
  "importer.upload.fileSizeError": {
    message:
      "Diese Datei überschreitet das Limit von 10 MB. Bitte versuchen Sie eine kleinere Datei.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Dieser Dateityp wird nicht unterstützt. Bitte verwenden Sie eine CSV-, PDF-, OFX- oder Bilddatei (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Ihre Datei wird gelesen\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.fileSize": {
    message: "{size} KB",
    description: "Display file size in KB",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Andere Datei wählen",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Datei hier ablegen",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Unterstützt CSV, PDF, OFX und Bilddateien bis 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Dateien durchsuchen",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "CSV-Format-Referenz",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Verwenden Sie Spalten für Datum (JJJJ-MM-TT), Zahlungsempfänger, Beschreibung und Betrag. Negative Werte stehen für Ausgaben.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDFs, OFX-Dateien und Bilder werden automatisch mit KI analysiert — keine manuelle Formatierung nötig.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Dateiformat wird erkannt...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "CSV wird auf Ihrem Gerät analysiert...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Verarbeitung mit KI (dies kann 5-15 Sekunden dauern)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Wird verarbeitet...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message:
      "KI wird verwendet, um Transaktionsdaten aus Ihrer Datei zu extrahieren",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Schnelle lokale Verarbeitung für Standard-CSV-Format",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Andere Datei hochladen",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Premium-Funktion erforderlich",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Der aktuelle Dateityp erfordert KI-gestützte Analyse",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Auf Premium upgraden",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "PDF-, OFX- und Bilddateien automatisch mit KI analysieren",
    description: "Description of premium parsing features",
  },
  "importer.error.processing": {
    message: "Wird verarbeitet...",
    description: "Button text while processing upgrade",
  },
  "importer.error.upgradeNow": {
    message: "Jetzt upgraden",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Oder",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "CSV-Format verwenden",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message:
      "CSV-Dateien können kostenlos ohne Premium-Zugang analysiert werden",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "CSV-Beispiel herunterladen",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Datei konnte nicht analysiert werden",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Bei der Verarbeitung Ihrer Datei ist ein Serverfehler aufgetreten. Bitte versuchen Sie es in einigen Sekunden erneut.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Vorschau der importierten Daten",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message:
      "Überprüfen Sie die analysierten Transaktionen vor der Konfiguration der Konten",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Gültig",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Fehler",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Zeile",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Datum",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Zahlungsempfänger",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Beschreibung",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Betrag",
    description: "Table header for amount column",
  },
  "importer.preview.status": {
    message: "Status",
    description: "Table header for status column",
  },
  "importer.preview.noData": {
    message: "Keine Daten zum Anzeigen",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Validierungsfehler gefunden",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Einige Zeilen haben Validierungsfehler. Bitte korrigieren Sie diese, bevor Sie fortfahren, oder sie werden beim Import übersprungen.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Andere Datei hochladen",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Weiter zur Konfiguration",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "JJJJ-MM-TT",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Name des Zahlungsempfängers",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Beschreibung",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Zum Bearbeiten klicken",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.errorStatus": {
    message: "Fehler",
    description: "Status label for invalid rows",
  },
  "importer.preview.validStatus": {
    message: "Gültig",
    description: "Status label for valid rows",
  },
  "importer.preview.actions": {
    message: "Aktionen",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Zeile löschen",
    description: "Aria label for delete row button",
  },
  "importer.preview.rowDeleted": {
    message: "Zeile gelöscht",
    description: "Toast message when row is deleted",
  },
  "importer.preview.emptyFileTitle": {
    message: "Keine Transaktionen gefunden",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "Die Datei wurde erfolgreich analysiert, aber es wurden keine Transaktionsdaten gefunden. Bitte überprüfen Sie Ihre Datei und versuchen Sie es erneut.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.emptyFileHint": {
    message:
      "Stellen Sie sicher, dass Ihre Datei Transaktionsdaten im richtigen Format enthält.",
    description: "Hint for empty file state",
  },
  "importer.preview.retryUpload": {
    message: "Andere Datei versuchen",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Import-Einstellungen konfigurieren",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Legen Sie das Quellkonto und die Währung für alle Transaktionen fest und weisen Sie dann Zielkonten für jede Zeile zu",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Quellkonto",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Quellkonto auswählen...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "Das Bankkonto, von dem diese Transaktionen stammen",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Währung",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Währung für alle Transaktionen",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Zielkonten zuweisen",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Zurück",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Wird importiert...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "{count} Transaktionen importieren",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "{count} Transaktion importieren",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "{count} Transaktionen importieren",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Quellkonto ist erforderlich",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "Währung ist erforderlich",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Mindestens eine Transaktion ist erforderlich",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "Alle ausgewählten Transaktionen müssen ein Zielkonto haben",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Mindestens eine Transaktion muss ausgewählt sein",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Nach Beschreibung suchen...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Nach Betrag filtern",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Alle Beträge",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Nur positive",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Nur negative",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Alle sichtbaren Zeilen auswählen",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Zielkonto",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Wird kategorisiert...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "KI-Ausfüllung",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Keine Transaktionen entsprechen Ihren Filtern",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Keine Transaktionen zu konfigurieren",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Transaktion auswählen",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Konto auswählen...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Erforderlich für ausgewählte Zeilen",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} Transaktionen fehlen Zielkonten. Bitte weisen Sie allen ausgewählten Zeilen Zielkonten zu, bevor Sie importieren.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} Transaktion fehlt ein Zielkonto. Bitte weisen Sie allen ausgewählten Zeilen Zielkonten zu, bevor Sie importieren.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} Transaktionen fehlen Zielkonten. Bitte weisen Sie allen ausgewählten Zeilen Zielkonten zu, bevor Sie importieren.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "KI-Kategorisierung abgeschlossen!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count} Transaktionen erfolgreich kategorisiert",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count} Transaktion erfolgreich kategorisiert",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count} Transaktionen erfolgreich kategorisiert",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "KI-Kategorisierung fehlgeschlagen",
    description: "Toast title for failed AI categorization",
  },
  "importer.accountMapping.aiFailedDescription": {
    message: "Kategorisierung fehlgeschlagen",
    description:
      "Toast description for failed AI categorization (will be replaced with actual error)",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Transaktionen werden importiert...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Bitte warten Sie, während wir Ihre Transaktionen zum Hauptbuch hinzufügen",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Import erfolgreich!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count} Transaktionen erfolgreich importiert",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count} Transaktion erfolgreich importiert",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count} Transaktionen erfolgreich importiert",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} Transaktionen konnten nicht importiert werden",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} Transaktion konnte nicht importiert werden",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} Transaktionen konnten nicht importiert werden",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Journal anzeigen",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Mehr importieren",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Fehlgeschlagene Transaktionen:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Zeile",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "weitere Fehler",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Import fehlgeschlagen",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Beim Importieren von Transaktionen ist ein Fehler aufgetreten",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Fehlerdetails:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Neu beginnen",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Intelligenter Import",
    description: "Page title for the importer page",
  },
};

export default deImporter;
