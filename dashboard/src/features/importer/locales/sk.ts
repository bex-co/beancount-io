export interface TranslationEntry {
  message: string;
  description: string;
}

const skImporter: Record<string, TranslationEntry> = {
  // Premium Banner
  "importer.premiumBannerTitle": {
    message: "Inteligentný import je aktívny — Bezplatný skorý prístup",
    description: "Title for premium feature banner",
  },
  "importer.premiumBannerDismiss": {
    message: "Zavrieť banner",
    description: "Aria label for dismiss banner button",
  },
  "importer.premiumBannerDescription": {
    message:
      "Importujte bankové výpisy z PDF, OFX súborov a obrázkov za sekundy s AI analýzou. Bezplatné na obmedzený čas.",
    description: "Description of premium importer features",
  },

  // File Upload
  "importer.upload.title": {
    message: "Nahrať súbor",
    description: "Title for file upload card",
  },
  "importer.upload.description": {
    message:
      "Nahrajte svoj bankový výpis alebo súbor transakcií. Podporované formáty: CSV, PDF, OFX alebo obrázky (PNG/JPG). Maximum 10MB.",
    description: "Description of supported file formats and size limit",
  },
  "importer.upload.fileSizeError": {
    message: "Tento súbor presahuje limit 10 MB. Skúste prosím menší súbor.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Tento typ súboru nie je podporovaný. Prosím, použite súbor CSV, PDF, OFX alebo obrázok (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Čítanie vášho súboru\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.fileSize": {
    message: "{size} KB",
    description: "Display file size in KB",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Vybrať iný súbor",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Pustite súbor sem",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Podporuje CSV, PDF, OFX a obrázky do 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Prehľadávať súbory",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Referencia formátu CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Použite stĺpce pre Dátum (RRRR-MM-DD), Príjemcu, Popis a Sumu. Záporné hodnoty predstavujú výdavky.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDF, OFX súbory a obrázky sa analyzujú automaticky pomocou AI — bez manuálneho formátovania.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Detekuje sa formát súboru...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Analyzuje sa CSV na vašom zariadení...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Spracováva sa pomocou AI (toto môže trvať 5-15 sekúnd)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Spracováva sa...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "Používa sa AI na extrakciu údajov transakcií z vášho súboru",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Rýchle lokálne spracovanie pre štandardný CSV formát",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Nahrať iný súbor",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Vyžaduje sa prémiová funkcia",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Aktuálny typ súboru vyžaduje AI analýzu",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Prejsť na prémium",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Analyzujte PDF, OFX a obrázky automaticky pomocou AI",
    description: "Description of premium parsing features",
  },
  "importer.error.processing": {
    message: "Spracováva sa...",
    description: "Button text while processing upgrade",
  },
  "importer.error.upgradeNow": {
    message: "Aktualizovať teraz",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Alebo",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Použiť CSV formát",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "CSV súbory môžu byť analyzované zadarmo bez prémiového prístupu",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Stiahnuť CSV príklad",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Nepodarilo sa analyzovať súbor",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Pri spracovaní vášho súboru došlo k chybe servera. Prosím, skúste to znova o niekoľko sekúnd.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Náhľad importovaných údajov",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "Skontrolujte analyzované transakcie pred konfiguráciou účtov",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Platné",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Chyby",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Riadok",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Dátum",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Príjemca",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Popis",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Suma",
    description: "Table header for amount column",
  },
  "importer.preview.status": {
    message: "Stav",
    description: "Table header for status column",
  },
  "importer.preview.noData": {
    message: "Žiadne údaje na zobrazenie",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Nájdené chyby validácie",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Niektoré riadky majú chyby validácie. Prosím, opravte ich pred pokračovaním alebo budú počas importu preskočené.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Nahrať iný súbor",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Pokračovať na konfiguráciu",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "RRRR-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Meno príjemcu",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Popis",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Kliknite na úpravu",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.errorStatus": {
    message: "Chyba",
    description: "Status label for invalid rows",
  },
  "importer.preview.validStatus": {
    message: "Platný",
    description: "Status label for valid rows",
  },
  "importer.preview.actions": {
    message: "Akcie",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Odstrániť riadok",
    description: "Aria label for delete row button",
  },
  "importer.preview.rowDeleted": {
    message: "Riadok odstránený",
    description: "Toast message when row is deleted",
  },
  "importer.preview.emptyFileTitle": {
    message: "Nenašli sa žiadne transakcie",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "Súbor bol úspešne analyzovaný, ale nenašli sa žiadne údaje o transakciách. Skontrolujte svoj súbor a skúste to znova.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.emptyFileHint": {
    message:
      "Uistite sa, že váš súbor obsahuje údaje o transakciách v správnom formáte.",
    description: "Hint for empty file state",
  },
  "importer.preview.retryUpload": {
    message: "Skúsiť iný súbor",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Konfigurovať nastavenia importu",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Nastavte zdrojový účet a menu pre všetky transakcie, potom priraďte cieľové účty pre každý riadok",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Zdrojový účet",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Vyberte zdrojový účet...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "Bankový účet, z ktorého pochádzajú tieto transakcie",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Mena",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Mena pre všetky transakcie",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Priradiť cieľové účty",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Späť",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Importuje sa...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Importovať {count} transakcií",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Importovať {count} transakciu",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Importovať {count} transakcií",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Zdrojový účet je povinný",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "Mena je povinná",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Vyžaduje sa aspoň jedna transakcia",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "Všetky vybrané transakcie musia mať cieľový účet",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Musí byť vybratá aspoň jedna transakcia",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Vyhľadať podľa popisu...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Filtrovať podľa sumy",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Všetky sumy",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Len kladné",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Len záporné",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Vybrať všetky viditeľné riadky",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Cieľový účet",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Kategorizuje sa...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "AI vyplnenie",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Žiadne transakcie nezodpovedajú vašim filtrom",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Žiadne transakcie na konfiguráciu",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Vybrať transakciu",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Vybrať účet...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Povinné pre vybrané riadky",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} transakciám chýbajú cieľové účty. Prosím, priraďte cieľové účty všetkým vybraným riadkom pred importom.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} transakcii chýba cieľový účet. Prosím, priraďte cieľové účty všetkým vybraným riadkom pred importom.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} transakciám chýbajú cieľové účty. Prosím, priraďte cieľové účty všetkým vybraným riadkom pred importom.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "AI kategorizácia dokončená!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "Úspešne kategorizovaných {count} transakcií",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "Úspešne kategorizovaná {count} transakcia",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "Úspešne kategorizovaných {count} transakcií",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "AI kategorizácia zlyhala",
    description: "Toast title for failed AI categorization",
  },
  "importer.accountMapping.aiFailedDescription": {
    message: "Kategorizácia zlyhala",
    description:
      "Toast description for failed AI categorization (will be replaced with actual error)",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Importujú sa transakcie...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message: "Prosím, počkajte, kým pridávame vaše transakcie do hlavnej knihy",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Import úspešný!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "Úspešne importovaných {count} transakcií",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "Úspešne importovaná {count} transakcia",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "Úspešne importovaných {count} transakcií",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} transakcií sa nepodarilo importovať",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} transakciu sa nepodarilo importovať",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} transakcií sa nepodarilo importovať",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Zobraziť denník",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Importovať viac",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Neúspešné transakcie:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Riadok",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "ďalších chýb",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Import zlyhal",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Pri importovaní transakcií došlo k chybe",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Podrobnosti chyby:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Začať odznova",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Inteligentný import",
    description: "Page title for the importer page",
  },
};

export default skImporter;
