export interface TranslationEntry {
  message: string;
  description: string;
}

const enImporter: Record<string, TranslationEntry> = {
  "page.importer.title": {
    message: "Smart Import",
    description: "Page title for the importer page",
  },

  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message: "This file exceeds the 10 MB limit. Please try a smaller file.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "This file type isn't supported. Please use a CSV, PDF, OFX, or image file (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Reading your file\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Choose Different File",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Drop your file here",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Supports CSV, PDF, OFX, and image files up to 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Browse files",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "CSV format reference",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Use columns for Date (YYYY-MM-DD), Payee, Description, and Amount. Negative values represent expenses.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDFs, OFX files, and images are parsed automatically with AI \u2014 no manual formatting needed.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Detecting file format...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Parsing CSV on your device...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Processing with AI (this may take 5-15 seconds)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Processing...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "Using AI to extract transaction data from your file",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Fast local processing for standard CSV format",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Upload Different File",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Premium Feature Required",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Current file type requires AI-powered parsing",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Upgrade to Premium",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Parse PDF, OFX, and image files automatically with AI",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "Upgrade Now",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Or",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Use CSV Format",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "CSV files can be parsed for free without premium access",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Download CSV Example",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Failed to Parse File",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "A server error occurred while processing your file. Please try again in a few seconds.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Preview Imported Data",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "Review the parsed transactions before configuring accounts",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Valid",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Errors",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Row",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Date",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Payee",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Description",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Amount",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "No data to display",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Validation Errors Found",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Some rows have validation errors. Please fix them before proceeding, or they will be skipped during import.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Upload Different File",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Continue to Configure",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "YYYY-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Payee name",
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
    message: "Click to edit",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.actions": {
    message: "Actions",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Delete row",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "No Transactions Found",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "The file was successfully parsed, but no transaction data was found. Please check your file and try again.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "Try Another File",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Configure Import Settings",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Set the source account and currency for all transactions, then assign target accounts for each row",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Source Account",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Select source account...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "The bank account these transactions came from",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Currency",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Currency for all transactions",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Assign Target Accounts",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Back",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Importing...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Import {count} Transactions",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Import {count} Transaction",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Import {count} Transactions",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Source account is required",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "Currency is required",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "At least one transaction is required",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "All selected transactions must have a target account",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "At least one transaction must be selected",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Search by description...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Filter by amount",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "All amounts",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Positive only",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Negative only",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Select all visible rows",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Target Account",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Categorizing...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "AI Fill",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "No transactions match your filters",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "No transactions to configure",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Select transaction",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Select account...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Required for selected rows",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} transactions are missing target accounts. Please assign target accounts to all selected rows before importing.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} transaction is missing a target account. Please assign target accounts to all selected rows before importing.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} transactions are missing target accounts. Please assign target accounts to all selected rows before importing.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "AI categorization complete!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "Successfully categorized {count} transactions",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "Successfully categorized {count} transaction",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "Successfully categorized {count} transactions",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "AI categorization failed",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Importing transactions...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message: "Please wait while we add your transactions to the ledger",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Import Successful!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "Successfully imported {count} transactions",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "Successfully imported {count} transaction",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "Successfully imported {count} transactions",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} transactions failed to import",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} transaction failed to import",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} transactions failed to import",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "View Journal",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Import More",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Failed Transactions:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Row",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "more errors",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Import Failed",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "An error occurred while importing transactions",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Error Details:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Start Over",
    description: "Button to restart import process",
  },
};

export default enImporter;
