export interface TranslationEntry {
  message: string;
  description: string;
}

const caImporter: Record<string, TranslationEntry> = {
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message:
      "Aquest fitxer supera el límit de 10 MB. Proveu amb un fitxer més petit.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Aquest tipus de fitxer no és compatible. Utilitzeu un fitxer CSV, PDF, OFX o imatge (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Llegint el vostre fitxer\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Tria un altre fitxer",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Deixeu anar el fitxer aquí",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Compatible amb CSV, PDF, OFX i imatges fins a 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Explorar fitxers",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Referència de format CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Utilitzeu columnes per a Data (AAAA-MM-DD), Beneficiari, Descripció i Import. Els valors negatius representen despeses.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "Els PDF, fitxers OFX i imatges s'analitzen automàticament amb IA — sense formatació manual.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Detectant format del fitxer...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Analitzant CSV al vostre dispositiu...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Processant amb IA (això pot trigar 5-15 segons)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Processant...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message:
      "Utilitzant IA per extreure dades de transaccions del vostre fitxer",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Processament local ràpid per a format CSV estàndard",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Pujar un altre fitxer",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Es requereix funció premium",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "El tipus de fitxer actual requereix anàlisi amb IA",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Actualitzar a premium",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Analitzeu fitxers PDF, OFX i imatges automàticament amb IA",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "Actualitzar ara",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "O",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Utilitzar format CSV",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message:
      "Els fitxers CSV es poden analitzar gratuïtament sense accés premium",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Descarregar exemple CSV",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "No s'ha pogut analitzar el fitxer",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "S'ha produït un error del servidor en processar el vostre fitxer. Torneu-ho a provar en uns segons.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Vista prèvia de les dades importades",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message:
      "Reviseu les transaccions analitzades abans de configurar els comptes",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Vàlides",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Errors",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Fila",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Data",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Beneficiari",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Descripció",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Import",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "No hi ha dades per mostrar",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "S'han trobat errors de validació",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Algunes files tenen errors de validació. Corregiu-los abans de continuar o s'ometran durant la importació.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Pujar un altre fitxer",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Continuar a configurar",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "AAAA-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Nom del beneficiari",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Descripció",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Feu clic per editar",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.actions": {
    message: "Accions",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Elimina la fila",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "No s'han trobat transaccions",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "El fitxer s'ha analitzat correctament, però no s'han trobat dades de transaccions. Si us plau, reviseu el vostre fitxer i torneu-ho a intentar.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "Proveu un altre fitxer",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Configurar els paràmetres d'importació",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Establiu el compte d'origen i la moneda per a totes les transaccions, després assigneu comptes de destí per a cada fila",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Compte d'origen",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Seleccioneu el compte d'origen...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "El compte bancari del qual provenen aquestes transaccions",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Moneda",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Moneda per a totes les transaccions",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Assignar comptes de destí",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Enrere",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Important...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Importar {count} transaccions",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Importar {count} transacció",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Importar {count} transaccions",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "El compte d'origen és obligatori",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "La moneda és obligatòria",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Es requereix almenys una transacció",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message:
      "Totes les transaccions seleccionades han de tenir un compte de destí",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "S'ha de seleccionar almenys una transacció",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Cercar per descripció...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Filtrar per import",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Tots els imports",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Només positius",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Només negatius",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Seleccionar totes les files visibles",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Compte de destí",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Categoritzant...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "Emplenar amb IA",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "No hi ha transaccions que coincideixin amb els vostres filtres",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "No hi ha transaccions per configurar",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Seleccionar transacció",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Seleccionar compte...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Obligatori per a les files seleccionades",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} transaccions no tenen comptes de destí. Assigneu comptes de destí a totes les files seleccionades abans d'importar.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} transacció no té un compte de destí. Assigneu comptes de destí a totes les files seleccionades abans d'importar.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} transaccions no tenen comptes de destí. Assigneu comptes de destí a totes les files seleccionades abans d'importar.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "Categorització amb IA completada!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "S'han categoritzat correctament {count} transaccions",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "S'ha categoritzat correctament {count} transacció",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "S'han categoritzat correctament {count} transaccions",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "La categorització amb IA ha fallat",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Important transaccions...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message: "Espereu mentre afegim les vostres transaccions al llibre major",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Importació correcta!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "S'han importat correctament {count} transaccions",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "S'ha importat correctament {count} transacció",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "S'han importat correctament {count} transaccions",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} transaccions no s'han pogut importar",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} transacció no s'ha pogut importar",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} transaccions no s'han pogut importar",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Veure diari",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Importar més",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Transaccions fallides:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Fila",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.failedTitle": {
    message: "Importació fallida",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "S'ha produït un error en importar les transaccions",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Detalls de l'error:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Tornar a començar",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Importació intel·ligent",
    description: "Page title for the importer page",
  },
  "importer.finish.note": {
    message: "Nota",
    description: "Label before a partial import note",
  },
  "importer.finish.andMoreErrors": {
    message: "…i {count} més errors",
    description: "Count of additional import errors",
  },
  "importer.preview.editCellLabel": {
    message: "Edita {field}. Valor actual: {value}",
    description: "Accessible label for an editable import cell",
  },
  "importer.preview.field": {
    message: "camp",
    description: "Fallback name for an editable import field",
  },
  "importer.validation.dateRequired": {
    message: "La data és necessària",
    description: "Validation error for a missing import date",
  },
  "importer.validation.invalidDateFormat": {
    message: "Format de data no vàlid. S'esperava AAAA-MM-DD",
    description: "Validation error for an invalid import date",
  },
  "importer.validation.payeeRequired": {
    message: "Cal el beneficiari",
    description: "Validation error for a missing import payee",
  },
  "importer.validation.descriptionRequired": {
    message: "És necessària la descripció",
    description: "Validation error for a missing import description",
  },
  "importer.validation.amountRequired": {
    message: "La quantitat és necessària",
    description: "Validation error for a missing import amount",
  },
  "importer.validation.amountInvalid": {
    message: "L'import ha de ser un número vàlid",
    description: "Validation error for an invalid import amount",
  },
};

export default caImporter;
