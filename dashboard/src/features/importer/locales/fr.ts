export interface TranslationEntry {
  message: string;
  description: string;
}

const frImporter: Record<string, TranslationEntry> = {
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message:
      "Ce fichier dépasse la limite de 10 Mo. Veuillez essayer un fichier plus petit.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Ce type de fichier n'est pas pris en charge. Veuillez utiliser un fichier CSV, PDF, OFX ou image (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Lecture de votre fichier\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Choisir un autre fichier",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Déposez votre fichier ici",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Compatible avec CSV, PDF, OFX et images jusqu'à 10 Mo",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Parcourir les fichiers",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Référence de format CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Utilisez des colonnes pour Date (AAAA-MM-JJ), Bénéficiaire, Description et Montant. Les valeurs négatives représentent les dépenses.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "Les PDF, fichiers OFX et images sont analysés automatiquement par l'IA — aucun formatage manuel nécessaire.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Détection du format du fichier...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Analyse du CSV sur votre appareil...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Traitement par l'IA (cela peut prendre 5 à 15 secondes)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Traitement en cours...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message:
      "Utilisation de l'IA pour extraire les données de transaction de votre fichier",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Traitement local rapide pour le format CSV standard",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Télécharger un autre fichier",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Fonction premium requise",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Le type de fichier actuel nécessite une analyse par IA",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Passer à la version premium",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message:
      "Analysez automatiquement les fichiers PDF, OFX et images avec l'IA",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "Mettre à niveau maintenant",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Ou",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Utiliser le format CSV",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message:
      "Les fichiers CSV peuvent être analysés gratuitement sans accès premium",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Télécharger un exemple CSV",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Échec de l'analyse du fichier",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Une erreur serveur s'est produite lors du traitement de votre fichier. Veuillez réessayer dans quelques secondes.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Aperçu des données importées",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message:
      "Examinez les transactions analysées avant de configurer les comptes",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Valides",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Erreurs",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Ligne",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Date",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Bénéficiaire",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Description",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Montant",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "Aucune donnée à afficher",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Erreurs de validation détectées",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Certaines lignes contiennent des erreurs de validation. Veuillez les corriger avant de continuer, sinon elles seront ignorées lors de l'importation.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Télécharger un autre fichier",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Continuer la configuration",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "AAAA-MM-JJ",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Nom du bénéficiaire",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Description",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Cliquer pour modifier",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.actions": {
    message: "Actions",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Supprimer la ligne",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "Aucune transaction trouvée",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "Le fichier a été analysé avec succès, mais aucune donnée de transaction n'a été trouvée. Veuillez vérifier votre fichier et réessayer.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "Essayer un autre fichier",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Configurer les paramètres d'importation",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Définissez le compte source et la devise pour toutes les transactions, puis attribuez des comptes cibles pour chaque ligne",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Compte source",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Sélectionner le compte source...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "Le compte bancaire d'où proviennent ces transactions",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Devise",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Devise pour toutes les transactions",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Attribuer des comptes cibles",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Retour",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Importation en cours...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Importer {count} transactions",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Importer {count} transaction",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Importer {count} transactions",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Le compte source est obligatoire",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "La devise est obligatoire",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Au moins une transaction est requise",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message:
      "Toutes les transactions sélectionnées doivent avoir un compte cible",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Au moins une transaction doit être sélectionnée",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Rechercher par description...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Filtrer par montant",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Tous les montants",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Positifs uniquement",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Négatifs uniquement",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Sélectionner toutes les lignes visibles",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Compte cible",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Catégorisation en cours...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "Remplissage IA",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Aucune transaction ne correspond à vos filtres",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Aucune transaction à configurer",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Sélectionner la transaction",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Sélectionner un compte...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Obligatoire pour les lignes sélectionnées",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} transactions n'ont pas de comptes cibles. Veuillez attribuer des comptes cibles à toutes les lignes sélectionnées avant d'importer.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} transaction n'a pas de compte cible. Veuillez attribuer des comptes cibles à toutes les lignes sélectionnées avant d'importer.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} transactions n'ont pas de comptes cibles. Veuillez attribuer des comptes cibles à toutes les lignes sélectionnées avant d'importer.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "Catégorisation IA terminée !",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count} transactions catégorisées avec succès",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count} transaction catégorisée avec succès",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count} transactions catégorisées avec succès",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "Échec de la catégorisation IA",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Importation des transactions en cours...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Veuillez patienter pendant que nous ajoutons vos transactions au grand livre",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Importation réussie !",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count} transactions importées avec succès",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count} transaction importée avec succès",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count} transactions importées avec succès",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} transactions n'ont pas pu être importées",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} transaction n'a pas pu être importée",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} transactions n'ont pas pu être importées",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Voir le journal",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Importer plus",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Transactions échouées :",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Ligne",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "erreurs supplémentaires",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Échec de l'importation",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Une erreur s'est produite lors de l'importation des transactions",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Détails de l'erreur :",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Recommencer",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Import intelligent",
    description: "Page title for the importer page",
  },
};

export default frImporter;
