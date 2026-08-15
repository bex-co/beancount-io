export interface TranslationEntry {
  message: string;
  description: string;
}

const ptImporter: Record<string, TranslationEntry> = {
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message:
      "Este arquivo excede o limite de 10 MB. Por favor, tente um arquivo menor.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Este tipo de arquivo não é suportado. Por favor, use um arquivo CSV, PDF, OFX ou imagem (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Lendo seu arquivo\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Escolher outro arquivo",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Solte seu arquivo aqui",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Suporta CSV, PDF, OFX e imagens até 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Procurar arquivos",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Referência de formato CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Use colunas para Data (AAAA-MM-DD), Beneficiário, Descrição e Valor. Valores negativos representam despesas.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDFs, arquivos OFX e imagens são analisados automaticamente com IA — sem formatação manual.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Detectando formato do arquivo...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Analisando CSV no seu dispositivo...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Processando com IA (isso pode levar de 5 a 15 segundos)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Processando...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "Usando IA para extrair dados de transações do seu arquivo",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Processamento local rápido para formato CSV padrão",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Carregar outro arquivo",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Recurso premium necessário",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "O tipo de arquivo atual requer análise por IA",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Atualizar para premium",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Analise arquivos PDF, OFX e imagens automaticamente com IA",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "Atualizar agora",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Ou",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Usar formato CSV",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message:
      "Arquivos CSV podem ser analisados gratuitamente sem acesso premium",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Baixar exemplo CSV",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Falha ao analisar arquivo",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Ocorreu um erro no servidor ao processar seu arquivo. Por favor, tente novamente em alguns segundos.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Visualizar dados importados",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "Revise as transações analisadas antes de configurar as contas",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Válidas",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Erros",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Linha",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Data",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Beneficiário",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Descrição",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Valor",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "Nenhum dado para exibir",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Erros de validação encontrados",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Algumas linhas têm erros de validação. Por favor, corrija-os antes de continuar ou eles serão ignorados durante a importação.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Carregar outro arquivo",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Continuar para configurar",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "AAAA-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Nome do beneficiário",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Descrição",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Clique para editar",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.actions": {
    message: "Ações",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Excluir linha",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "Nenhuma transação encontrada",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "O arquivo foi analisado com sucesso, mas nenhum dado de transação foi encontrado. Verifique seu arquivo e tente novamente.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "Tentar outro arquivo",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Configurar definições de importação",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Defina a conta de origem e a moeda para todas as transações, depois atribua contas de destino para cada linha",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Conta de origem",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Selecionar conta de origem...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "A conta bancária de onde vieram essas transações",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Moeda",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Moeda para todas as transações",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Atribuir contas de destino",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Voltar",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Importando...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Importar {count} transações",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Importar {count} transação",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Importar {count} transações",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "A conta de origem é obrigatória",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "A moeda é obrigatória",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Pelo menos uma transação é necessária",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "Todas as transações selecionadas devem ter uma conta de destino",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Pelo menos uma transação deve ser selecionada",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Pesquisar por descrição...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Filtrar por valor",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Todos os valores",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Apenas positivos",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Apenas negativos",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Selecionar todas as linhas visíveis",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Conta de destino",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Categorizando...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "Preenchimento IA",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Nenhuma transação corresponde aos seus filtros",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Nenhuma transação para configurar",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Selecionar transação",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Selecionar conta...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Obrigatório para linhas selecionadas",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} transações não têm contas de destino. Por favor, atribua contas de destino a todas as linhas selecionadas antes de importar.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} transação não tem uma conta de destino. Por favor, atribua contas de destino a todas as linhas selecionadas antes de importar.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} transações não têm contas de destino. Por favor, atribua contas de destino a todas as linhas selecionadas antes de importar.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "Categorização por IA concluída!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count} transações categorizadas com sucesso",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count} transação categorizada com sucesso",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count} transações categorizadas com sucesso",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "Falha na categorização por IA",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Importando transações...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Por favor, aguarde enquanto adicionamos suas transações ao livro-razão",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Importação bem-sucedida!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count} transações importadas com sucesso",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count} transação importada com sucesso",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count} transações importadas com sucesso",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} transações falharam ao importar",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} transação falhou ao importar",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} transações falharam ao importar",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Ver diário",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Importar mais",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Transações que falharam:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Linha",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "mais erros",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Importação falhou",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Ocorreu um erro ao importar transações",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Detalhes do erro:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Começar novamente",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Importação inteligente",
    description: "Page title for the importer page",
  },
};

export default ptImporter;
