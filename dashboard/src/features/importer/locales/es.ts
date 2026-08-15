export interface TranslationEntry {
  message: string;
  description: string;
}

const esImporter: Record<string, TranslationEntry> = {
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message:
      "Este archivo supera el límite de 10 MB. Por favor, intente con un archivo más pequeño.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Este tipo de archivo no es compatible. Por favor, use un archivo CSV, PDF, OFX o imagen (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Leyendo tu archivo\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Elegir otro archivo",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Suelta tu archivo aquí",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Compatible con CSV, PDF, OFX e imágenes de hasta 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Explorar archivos",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Referencia de formato CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Use columnas para Fecha (AAAA-MM-DD), Beneficiario, Descripción y Monto. Los valores negativos representan gastos.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "Los PDF, archivos OFX e imágenes se analizan automáticamente con IA — sin formateo manual.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Detectando formato del archivo...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Analizando CSV en tu dispositivo...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Procesando con IA (esto puede tomar 5-15 segundos)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Procesando...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "Usando IA para extraer datos de transacciones de tu archivo",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Procesamiento local rápido para formato CSV estándar",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Subir otro archivo",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Función premium requerida",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "El tipo de archivo actual requiere análisis con IA",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Actualizar a premium",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Analiza archivos PDF, OFX e imágenes automáticamente con IA",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "Actualizar ahora",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "O",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Usar formato CSV",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "Los archivos CSV se pueden analizar gratis sin acceso premium",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Descargar ejemplo CSV",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Error al analizar el archivo",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Ocurrió un error del servidor al procesar tu archivo. Por favor, inténtalo de nuevo en unos segundos.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Vista previa de datos importados",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message:
      "Revisa las transacciones analizadas antes de configurar las cuentas",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Válidas",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Errores",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Fila",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Fecha",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Beneficiario",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Descripción",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Monto",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "No hay datos para mostrar",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Errores de validación encontrados",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Algunas filas tienen errores de validación. Por favor, corrígelos antes de continuar o se omitirán durante la importación.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Subir otro archivo",
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
    message: "Nombre del beneficiario",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Descripción",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Haz clic para editar",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.actions": {
    message: "Acciones",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Eliminar fila",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "No se encontraron transacciones",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "El archivo se analizó correctamente, pero no se encontraron datos de transacciones. Por favor, revise su archivo e intente nuevamente.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "Probar otro archivo",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Configurar ajustes de importación",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Establece la cuenta de origen y la moneda para todas las transacciones, luego asigna cuentas de destino para cada fila",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Cuenta de origen",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Seleccionar cuenta de origen...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "La cuenta bancaria de la que provienen estas transacciones",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Moneda",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Moneda para todas las transacciones",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Asignar cuentas de destino",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Atrás",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Importando...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Importar {count} transacciones",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Importar {count} transacción",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Importar {count} transacciones",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "La cuenta de origen es obligatoria",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "La moneda es obligatoria",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Se requiere al menos una transacción",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message:
      "Todas las transacciones seleccionadas deben tener una cuenta de destino",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Debe seleccionarse al menos una transacción",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Buscar por descripción...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Filtrar por monto",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Todos los montos",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Solo positivos",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Solo negativos",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Seleccionar todas las filas visibles",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Cuenta de destino",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Categorizando...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "Rellenar con IA",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "No hay transacciones que coincidan con tus filtros",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "No hay transacciones para configurar",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Seleccionar transacción",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Seleccionar cuenta...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Requerido para las filas seleccionadas",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} transacciones no tienen cuentas de destino. Por favor, asigna cuentas de destino a todas las filas seleccionadas antes de importar.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} transacción no tiene cuenta de destino. Por favor, asigna cuentas de destino a todas las filas seleccionadas antes de importar.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} transacciones no tienen cuentas de destino. Por favor, asigna cuentas de destino a todas las filas seleccionadas antes de importar.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "¡Categorización con IA completada!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "Se categorizaron exitosamente {count} transacciones",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "Se categorizó exitosamente {count} transacción",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "Se categorizaron exitosamente {count} transacciones",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "La categorización con IA falló",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Importando transacciones...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Por favor, espera mientras agregamos tus transacciones al libro mayor",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "¡Importación exitosa!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "Se importaron exitosamente {count} transacciones",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "Se importó exitosamente {count} transacción",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "Se importaron exitosamente {count} transacciones",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} transacciones no pudieron importarse",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} transacción no pudo importarse",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} transacciones no pudieron importarse",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Ver diario",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Importar más",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Transacciones fallidas:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Fila",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "más errores",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Importación fallida",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Ocurrió un error al importar transacciones",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Detalles del error:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Comenzar de nuevo",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Importación inteligente",
    description: "Page title for the importer page",
  },
};

export default esImporter;
