export interface TranslationEntry {
  message: string;
  description: string;
}

const ptJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Conta",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "Seletor de conta",
    description: "Dialog or dropdown title for selecting account",
  },
  "journal.accountPlaceholder": {
    message: "Conta (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Conta é obrigatória",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Contas",
    description: "Plural form of account",
  },
  "journal.accountsPlural": {
    message: "contas",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "Adicionar novo lançamento no diário",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "Adicionar Lançamento",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "Adicionar transação",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "Por favor, insira o valor",
    description: "Validation error when amount is not provided",
  },
  "journal.amountMustBeNumber": {
    message: "O valor deve ser um número válido",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Valor (ex.: 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Valor é obrigatório",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastOnePosting": {
    message: "Pelo menos um lançamento é obrigatório",
    description: "Validation error when no postings exist",
  },
  "journal.atLeastTwoPostings": {
    message: "Pelo menos dois lançamentos são necessários",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Saldo",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "Saldo",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Saldos após o lançamento",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Saldos antes do lançamento",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "O",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Lançamentos de orçamento",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Mudança",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Limpared transactions",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Fechar",
    description: "Close account entry type filter",
  },
  "journal.closeAccount": {
    message: "Fechar conta",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "Custo",
    description: "Table header for cost column",
  },
  "journal.createNewJournalEntry": {
    message: "Criar um novo lançamento no diário para este livro-razão",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Criar Lançamento de Conta",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Criar Lançamento de Saldo",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Criar Lançamento de Nota",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Criar Lançamento de Transação",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Moeda (ex.: USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Moeda é obrigatória",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Personalizado",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Data",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Documentos descobertos",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Documento",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "Baixar lançamentos filtrados atualmente como um arquivo Beancount",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Contexto do Lançamento",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Lançamento criado com sucesso",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Localização:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Erro ao carregar lançamentos do diário",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Exportar",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Exportar Diário",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Exportando...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Falha ao criar lançamento de saldo",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Falha ao criar lançamento de nota",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Falha ao criar transação",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Falha ao exportar diário",
    description: "Error message when journal export fails",
  },
  "journal.flagPlaceholder": {
    message: "Sinalizador (ex.: *)",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "De",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "Diário",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Diário exportado com sucesso",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "Falha ao carregar o diário: ",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message: 'Use o botão "Adicionar Transação" para criar lançamentos',
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "Envie arquivos beancount através da interface web",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "Importe dados contábeis existentes",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message: "Depois de adicionar algumas transações, elas aparecerão aqui.",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "Para começar:",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "Você ainda não tem entradas no diário.",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "Bem-vindo ao seu Diário! 📔",
    description: "Welcome title for empty journal page",
  },
  "journal.linked": {
    message: "V",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Documentos vinculados",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Carregando contexto do lançamento...",
    description: "Loading message while fetching entry context",
  },
  "journal.loadingMore": {
    message: "Carregando mais...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "Metadados",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "Descrição",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "Descrição",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "Descrição é obrigatória",
    description: "Validation error when narration is missing",
  },
  "journal.newEntry": {
    message: "Novo Lançamento",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Nenhuma moeda encontrada",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Nenhum lançamento no diário encontrado para os filtros atuais.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noMoreEntries": {
    message: "Não há mais entradas",
    description: "Message when no more entries to load",
  },
  "journal.noNarrationsFound": {
    message: "Nenhuma descrição encontrada",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Nenhum beneficiário encontrado",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Nota",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Conteúdo da nota",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Conteúdo da nota é obrigatório",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Abrir",
    description: "Open account entry type filter",
  },
  "journal.openAccount": {
    message: "Abrir conta",
    description: "Action to open a new account",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Outro transactions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Ajuste",
    description: "Pad entry type filter",
  },
  "journal.payee": {
    message: "Beneficiário",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "Beneficiário/Descrição",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Beneficiário",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "Beneficiário é obrigatório",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Transações pendentes",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "Por favor, insira...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "Lançamento",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "Lançamentos",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Preço",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "Preço",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "Adicionar rápido",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "Falha ao salvar",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "Transação salva!",
    description: "Success message after saving transaction",
  },
  "journal.selectAccount": {
    message: "Selecione a conta...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Selecione a data do saldo",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Selecione a moeda...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Selecione a descrição...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Selecione a data da nota",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Selecione o beneficiário...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.selectTransactionDate": {
    message: "Selecione a data da transação",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "Para",
    description: "Label for destination account in transaction",
  },
  "journal.toggleMetadata": {
    message: "Alternar metadados",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Alternar lançamentos",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Transação",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Transações",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Unidades",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Tipo de diretiva desconhecido",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default ptJournal;
