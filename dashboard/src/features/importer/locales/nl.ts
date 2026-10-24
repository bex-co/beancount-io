export interface TranslationEntry {
  message: string;
  description: string;
}

const nlImporter: Record<string, TranslationEntry> = {
  "importer.access.signedOut": {
    message: "Meld u aan om transacties in dit grootboek te importeren.",
    description: "Explanation when a signed-out visitor opens the importer",
  },
  "importer.access.title": {
    message: "Importeren niet beschikbaar",
    description: "Title when the importer cannot be used",
  },
  "importer.access.readOnly": {
    message:
      "Je hebt alleen leestoegang tot dit grootboek. Voor het importeren van transacties heb je schrijftoegang nodig. Je kunt het journaal, de bestanden en de query’s blijven bekijken.",
    description: "Explanation when the user cannot write to the ledger",
  },
  "importer.access.unresolved": {
    message:
      "Schrijftoegang kon niet worden bevestigd. Importeren is niet beschikbaar totdat je grootboekrechten zijn vastgesteld.",
    description: "Explanation when ledger write permissions are unavailable",
  },
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message:
      "Dit bestand overschrijdt de limiet van 10 MB. Probeer een kleiner bestand.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Dit bestandstype wordt niet ondersteund. Gebruik een CSV-, PDF-, OFX- of afbeeldingsbestand (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Uw bestand wordt gelezen\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Kies een ander bestand",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Laat uw bestand hier vallen",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Ondersteunt CSV, PDF, OFX en afbeeldingen tot 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Bestanden bladeren",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "CSV-formaat referentie",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Gebruik kolommen voor Datum (JJJJ-MM-DD), Begunstigde, Beschrijving en Bedrag. Negatieve waarden vertegenwoordigen uitgaven.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDF's, OFX-bestanden en afbeeldingen worden automatisch geanalyseerd met AI — geen handmatige opmaak nodig.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Bestandsformaat detecteren...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "CSV wordt geanalyseerd op uw apparaat...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Verwerken met AI (dit kan 5-15 seconden duren)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Verwerken...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "AI gebruiken om transactiegegevens uit uw bestand te extraheren",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Snelle lokale verwerking voor standaard CSV-formaat",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Upload een ander bestand",
    description: "Button to upload a different file after error",
  },
  "importer.aiOffer.title": {
    message: "We konden de kolommen van deze CSV niet lezen",
    description:
      "Title when a CSV's columns could not be read by the free client parser",
  },
  "importer.aiOffer.description": {
    message:
      "Slim importeren leest CSV-bestanden met de kolommen Datum, Begunstigde, Omschrijving en Bedrag gratis. Dit bestand kan in plaats daarvan met AI worden gelezen, wat je AI-tokens verbruikt.",
    description:
      "Explains the free CSV format and that AI parsing spends AI tokens",
  },
  "importer.aiOffer.parseWithAi": {
    message: "Met AI uitlezen (verbruikt AI-tokens)",
    description:
      "Button that parses the unreadable CSV with AI, spending AI tokens",
  },
  "importer.error.aiQuotaReached": {
    message: "Je hebt de AI-tokens van deze maand verbruikt",
    description:
      "Title when AI parsing of a CSV is refused because the month's AI tokens are used up",
  },
  "importer.error.aiQuotaReachedCsv": {
    message:
      "Uitlezen met AI is volgende maand of met Premium weer beschikbaar. Een CSV met de kolommen Datum, Begunstigde, Omschrijving en Bedrag wordt nog steeds gratis geïmporteerd.",
    description:
      "Explains when AI parsing returns and that a well-formed CSV still imports for free",
  },
  "importer.error.premiumRequired": {
    message: "Premiumfunctie vereist",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Het huidige bestandstype vereist AI-analyse",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPlan": {
    message: "Upgrade naar {plan}",
    description:
      "Heading over the paywall's upgrade button; {plan} is the plan the button recommends (the next tier up).",
  },
  "importer.error.upgradePlan": {
    message: "Upgrade je abonnement",
    description:
      "Heading over the paywall's upgrade button when no higher self-serve plan exists.",
  },
  "importer.error.upgradeDescription": {
    message: "Analyseer PDF-, OFX- en afbeeldingsbestanden automatisch met AI",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "Nu upgraden",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Of",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Gebruik CSV-formaat",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message:
      "CSV-bestanden kunnen gratis worden geanalyseerd zonder premiumtoegang",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Download CSV-voorbeeld",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Kon bestand niet analyseren",
    description: "Title for parse failure error",
  },
  "importer.error.notUtf8": {
    message: "Bestand is geen UTF-8-tekst",
    description: "Title when an uploaded CSV is not UTF-8 text",
  },
  "importer.error.notUtf8Description": {
    message:
      "Deze CSV bevat tekens die geen geldige UTF-8 zijn, dus importeren zou de tekst van begunstigden en omschrijvingen veranderen. Sla het bestand opnieuw op als CSV UTF-8 vanuit je bank of spreadsheet-app en upload dat bestand.",
    description: "How to re-save a CSV that is not UTF-8 text",
  },
  "importer.error.serverError": {
    message:
      "Er is een serverfout opgetreden tijdens het verwerken van uw bestand. Probeer het over een paar seconden opnieuw.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Voorbeeld van geïmporteerde gegevens",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message:
      "Controleer de geanalyseerde transacties voordat u accounts configureert",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Geldig",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Fouten",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Rij",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Datum",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Begunstigde",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Beschrijving",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Bedrag",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "Geen gegevens om weer te geven",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Validatiefouten gevonden",
    description: "Alert title for validation errors",
  },
  "importer.preview.recordWidthError": {
    message:
      "Dit record heeft niet precies vier velden (datum, begunstigde, omschrijving, bedrag). Verwijder de rij, of corrigeer het bestand en upload het opnieuw.",
    description:
      "Shown on a preview row whose CSV record has more or fewer than the four importer fields; editing its cells cannot fix it",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Sommige rijen bevatten validatiefouten. Corrigeer deze voordat u doorgaat, anders worden ze overgeslagen tijdens het importeren.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Upload een ander bestand",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Ga door naar configureren",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "JJJJ-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Naam begunstigde",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Beschrijving",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Klik om te bewerken",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.multilineHint": {
    message: "Enter slaat op. Shift+Enter voegt een regel toe.",
    description:
      "Hint under a multiline editable cell explaining the commit shortcut",
  },
  "importer.preview.actions": {
    message: "Acties",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Rij {row} verwijderen",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "Geen transacties gevonden",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "Het bestand is succesvol geparseerd, maar er zijn geen transactiegegevens gevonden. Controleer uw bestand en probeer het opnieuw.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "Probeer een ander bestand",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Importinstellingen configureren",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Stel de bronrekening en valuta in voor alle transacties en wijs vervolgens doelrekeningen toe voor elke rij",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Bronrekening",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Selecteer bronrekening...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "De bankrekening waar deze transacties vandaan komen",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Valuta",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Valuta voor alle transacties",
    description: "Hint text for currency field",
  },
  "importer.configure.currencyConflict_one": {
    message:
      "{count} rij ({rows}) staat in {symbol} ({currencies}), maar deze import zou hem boeken als {currency}.",
    description:
      "Import refusal: a selected row's amount carries a currency symbol that is not the chosen import currency. {count} is 1, {rows} the row number, {symbol} the symbol from the bank file (€, £…), {currencies} the currencies it can mean, {currency} the selected currency code",
  },
  "importer.configure.currencyConflict_other": {
    message:
      "{count} rijen ({rows}) staan in {symbol} ({currencies}), maar deze import zou ze boeken als {currency}.",
    description:
      "Import refusal for several selected rows whose amounts carry a currency symbol other than the chosen import currency. {rows} lists their row numbers, possibly ending in …",
  },
  "importer.configure.currencyConflictRemedy": {
    message:
      "Eén import boekt één valuta. Kies de valuta van die rijen, of deselecteer ze en importeer ze apart. Er is niets geïmporteerd.",
    description:
      "How to resolve a currency conflict before importing: no conversion happens, so the user picks the matching currency or splits the file",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Doelrekeningen toewijzen",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Terug",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Importeren...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Importeer {count} transacties",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Importeer {count} transactie",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Importeer {count} transacties",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Bronrekening is verplicht",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "Valuta is verplicht",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Minimaal één transactie is vereist",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "Alle geselecteerde transacties moeten een doelrekening hebben",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Minimaal één transactie moet zijn geselecteerd",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Zoeken op beschrijving...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Filteren op bedrag",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Alle bedragen",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Nul of positief",
    description:
      "Filter option for amounts of zero or more: zero amounts are included, negative ones are not",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Alleen negatief",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Selecteer alle zichtbare rijen",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Doelrekening",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Categoriseren...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "AI-vulling",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Geen transacties komen overeen met uw filters",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Geen transacties om te configureren",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Selecteer transactie",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Selecteer rekening...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Verplicht voor geselecteerde rijen",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} transacties missen doelrekeningen. Wijs doelrekeningen toe aan alle geselecteerde rijen voordat u importeert.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} transactie mist een doelrekening. Wijs doelrekeningen toe aan alle geselecteerde rijen voordat u importeert.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} transacties missen doelrekeningen. Wijs doelrekeningen toe aan alle geselecteerde rijen voordat u importeert.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "AI-categorisering voltooid!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count} transacties succesvol gecategoriseerd",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count} transactie succesvol gecategoriseerd",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count} transacties succesvol gecategoriseerd",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiNoneApplied": {
    message:
      "Geen enkele suggestie was zeker genoeg om een doelrekening in te vullen.",
    description:
      "Toast description when AI Fill completed but no suggestion was confident enough to fill a target",
  },
  "importer.accountMapping.aiFailed": {
    message: "AI-categorisering mislukt",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Transacties importeren...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Even geduld terwijl we uw transacties aan het grootboek toevoegen",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Importeren geslaagd!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count} transacties succesvol geïmporteerd",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count} transactie succesvol geïmporteerd",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count} transacties succesvol geïmporteerd",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} transacties konden niet worden geïmporteerd",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} transactie kon niet worden geïmporteerd",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} transacties konden niet worden geïmporteerd",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Bekijk journaal",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Meer importeren",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Mislukte transacties:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Rij",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.failedTitle": {
    message: "Importeren mislukt",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Er is een fout opgetreden tijdens het importeren van transacties",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Foutdetails:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Opnieuw beginnen",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Slim importeren",
    description: "Page title for the importer page",
  },
  "importer.finish.note": {
    message: "Opmerking",
    description: "Label before a partial import note",
  },
  "importer.finish.andMoreErrors": {
    message: "…en {count} nog meer fouten",
    description: "Count of additional import errors",
  },
  "importer.preview.editCellLabel": {
    message: "Bewerk {field}, rij {row}. Huidige waarde: {value}",
    description: "Accessible label for an editable import cell",
  },
  "importer.preview.editFieldLabel": {
    message: "{field}, rij {row}",
    description: "Accessible label for the open editor of an import cell",
  },
  "importer.validation.dateRequired": {
    message: "Datum is vereist",
    description: "Validation error for a missing import date",
  },
  "importer.validation.invalidDateFormat": {
    message: "Ongeldig datumformaat. Verwacht JJJJ-MM-DD",
    description: "Validation error for an invalid import date",
  },
  "importer.validation.payeeRequired": {
    message: "Begunstigde is vereist",
    description: "Validation error for a missing import payee",
  },
  "importer.validation.descriptionRequired": {
    message: "Beschrijving is vereist",
    description: "Validation error for a missing import description",
  },
  "importer.validation.amountRequired": {
    message: "Bedrag is vereist",
    description: "Validation error for a missing import amount",
  },
  "importer.validation.amountInvalid": {
    message: "Bedrag moet een geldig getal zijn",
    description: "Validation error for an invalid import amount",
  },
  "importer.validation.amountMixedDecimals": {
    message:
      "Deze kolom mengt decimale punten (1,234.56) en decimale komma's (1.234,56). Gebruik één notatie per kolom.",
    description:
      "Validation error when an import amount column mixes point and comma decimal marks",
  },
  "importer.validation.amountUnsupportedPrecision": {
    message:
      "Dit bedrag kan niet exact worden geïmporteerd — verkort het zodat elk cijfer behouden blijft",
    description:
      "Validation error when Number conversion would change the exact decimal value",
  },
};

export default nlImporter;
