export interface TranslationEntry {
  message: string;
  description: string;
}

const ptPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "Contas conectadas",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "Apenas o proprietário do livro contábil ou um administrador pode conectar e gerenciar bancos.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ Conectado com sucesso",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Sincronização bancária",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Conectar uma conta",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Importe transações automaticamente com criptografia segura de nível bancário",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Simplifique seu fluxo de trabalho contábil",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Conecte suas contas bancárias pelo Plaid para importar transações automaticamente, economizar horas de digitação manual e manter seu livro sempre atualizado em tempo real.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Mais de 11.000 instituições",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Segurança de nível bancário",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Sincronização em tempo real",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Começar",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Por que conectar seu banco?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Importação automática",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Economize horas de digitação manual importando automaticamente, em tempo real, as transações das suas contas bancárias. Concentre-se na análise, não na entrada de dados.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Segurança de nível bancário",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "O Plaid usa criptografia de 256 bits e conta com a confiança de milhares de instituições financeiras. Suas credenciais nunca são armazenadas em nossos servidores.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Privacidade em primeiro lugar",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Nunca armazenamos suas credenciais bancárias nem vendemos seus dados. Suas informações financeiras são protegidas por padrões de privacidade líderes do setor.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Como funciona",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Conecte sua conta bancária em poucos passos simples",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Escolha seu banco",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message:
      "Pesquise entre mais de 11.000 instituições financeiras compatíveis",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Autenticação segura",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "Entre com segurança pelo sistema de autenticação do seu banco",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Comece a importar",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Suas transações serão sincronizadas automaticamente com seu livro",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Conectar outro banco",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Conectar um banco",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Conexões bancárias",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message: "Gerencie mapeamentos de contas, sincronize e desconecte bancos.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "Nenhum banco conectado",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Conecte um banco para importar transações automaticamente.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Sincronizar",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Sincronizando...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Gerenciar bancos",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Voltar às transações",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Erro",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Sincronização concluída",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "{transactions} de {banks}.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "{count} novas transações sincronizadas",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "{count} nova transação sincronizada",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_many": {
    message: "{count} novas transações sincronizadas",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "{count} novas transações sincronizadas",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} bancos",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} banco",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_many": {
    message: "{count} bancos",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} bancos",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} bancos precisam ser reconectados",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "{count} banco precisa ser reconectado",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_many": {
    message: "{count} bancos precisam ser reconectados",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "{count} bancos precisam ser reconectados",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Falha ao sincronizar as transações. Tente novamente.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Vinculada em {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Ativa",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Reautenticação necessária",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Desativada",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Última sincronização",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount_one": {
    message: "{count} transação",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_many": {
    message: "{count} transações",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_other": {
    message: "{count} transações",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Falhou",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Reconectando...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Reconectar banco",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Desconectando...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Desconectar",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Desconectar conta bancária",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Tem certeza de que deseja desconectar {institutionName}? Isso removerá todas as contas conectadas e interromperá a sincronização automática de transações.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Cancelar",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Banco desconectado",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} foi desconectado.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Erro",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Falha ao desconectar a conta bancária.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message:
      "Selecione uma conta bancária para configurar os mapeamentos de contas",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Nenhuma conta encontrada para este banco",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Gerir contas",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Adicione ou remova contas partilhadas por este banco",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Volte a ligar este banco primeiro",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Adicionar contas",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "A atualizar contas...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "A preparar...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "A aguardar o seu banco...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "A aplicar alterações...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Contas atualizadas",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added} adicionadas, {removed} removidas.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Sem alterações nas contas",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Nada mudou. Alguns bancos só permitem alterar as contas partilhadas na sua própria aplicação ou site.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Não foi possível atualizar as contas",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "O seu banco pode ter guardado a alteração. Reabra Gerir contas para tentar novamente.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Alterações de contas canceladas",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "O Plaid Link foi fechado sem alterar nenhuma conta.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Contas",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Moeda",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Conta do Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Salvando...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Salvar",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Cancelar",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Não mapeada",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Editar",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Definir mapeamento",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "Sugerida pela IA",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "A IA sugere: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Obtendo sugestões da IA...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Aceitar todas as sugestões ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Aceitando...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Conta inválida",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Insira um nome de conta do Beancount válido.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Mapeamento salvo",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} mapeada para {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Erro",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Falha ao salvar o mapeamento de conta.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Sugestões aceitas",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "{count} contas mapeadas com sugestões da IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "{count} conta mapeada com sugestões da IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_many": {
    message: "{count} contas mapeadas com sugestões da IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "{count} contas mapeadas com sugestões da IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - plural form",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "Nenhuma transação bancária",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Todas as transações foram sincronizadas com seu livro ou não há transações novas.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Transações bancárias",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Revise e envie {count} transações para seu livro",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "Revise e envie {count} transação para seu livro",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_many": {
    message: "Revise e envie {count} transações para seu livro",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.description_other": {
    message: "Revise e envie {count} transações para seu livro",
    description:
      "Card description for the transaction review table - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.submitting": {
    message: "Enviando...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Enviar",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Pesquisar por estabelecimento ou descrição...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Filtrar por banco",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Todos os bancos",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Filtrar por conta bancária",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Todas as contas bancárias",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected_one": {
    message: "{count} conta selecionada",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_many": {
    message: "{count} contas selecionadas",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_other": {
    message: "{count} contas selecionadas",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Nenhuma transação corresponde aos filtros atuais.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Limpar filtros",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} transações selecionadas estão ocultas pelos filtros atuais, mas ainda assim serão enviadas ou excluídas.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} transação selecionada está oculta pelos filtros atuais, mas ainda assim será enviada ou excluída.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_many": {
    message:
      "{count} transações selecionadas estão ocultas pelos filtros atuais, mas ainda assim serão enviadas ou excluídas.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} transações selecionadas estão ocultas pelos filtros atuais, mas ainda assim serão enviadas ou excluídas.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.setForSelected": {
    message: "Definir para os selecionados",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message:
      "Selecione primeiro as transações para definir a conta de destino delas.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message: "Definir a conta de destino para {count} transações selecionadas",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message: "Definir a conta de destino para {count} transação selecionada",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_many": {
    message: "Definir a conta de destino para {count} transações selecionadas",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message: "Definir a conta de destino para {count} transações selecionadas",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message:
      "{count} delas estão ocultas pelos filtros atuais e também serão definidas.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message:
      "{count} delas está oculta pelos filtros atuais e também será definida.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_many": {
    message:
      "{count} delas estão ocultas pelos filtros atuais e também serão definidas.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message:
      "{count} delas estão ocultas pelos filtros atuais e também serão definidas.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "Substituir também {count} contas de destino já definidas",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "Substituir também {count} conta de destino já definida",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_many": {
    message: "Substituir também {count} contas de destino já definidas",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "Substituir também {count} contas de destino já definidas",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} transações receberão esta conta.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} transação receberá esta conta.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_many": {
    message: "{count} transações receberão esta conta.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} transações receberão esta conta.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "Aplicar",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "Conta de destino definida",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} transações agora vão para {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} transação agora vai para {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_many": {
    message: "{count} transações agora vão para {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} transações agora vão para {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Escolha para qual arquivo importar",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} transações selecionadas precisam de contas de destino antes do envio.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message:
      "{count} transação selecionada precisa de uma conta de destino antes do envio.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_many": {
    message:
      "{count} transações selecionadas precisam de contas de destino antes do envio.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message:
      "{count} transações selecionadas precisam de contas de destino antes do envio.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.selectAll": {
    message: "Selecionar tudo",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Data",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Banco",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Conta de origem",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Estabelecimento",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Descrição",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Valor",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Conta de destino",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "IA...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Preencher com IA",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Selecionar conta...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Categorização concluída",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_one": {
    message: "A IA sugeriu contas para {count} transação.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_many": {
    message: "A IA sugeriu contas para {count} transações.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_other": {
    message: "A IA sugeriu contas para {count} transações.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Falha na categorização",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Falha ao categorizar as transações. Tente novamente.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Nenhuma transação selecionada",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Selecione pelo menos uma transação para enviar.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Contas de destino ausentes",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} transações selecionadas precisam de contas de destino.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message: "{count} transação selecionada precisa de uma conta de destino.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_many": {
    message: "{count} transações selecionadas precisam de contas de destino.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message: "{count} transações selecionadas precisam de contas de destino.",
    description:
      "Toast description for missing accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transações enviadas",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_one": {
    message: "{count} transação adicionada ao seu livro.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_many": {
    message: "{count} transações adicionadas ao seu livro.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_other": {
    message: "{count} transações adicionadas ao seu livro.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Falha no envio",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Falha ao enviar as transações. Tente novamente.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Excluir",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Excluindo...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Excluir transações?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Isso removerá permanentemente {count} transações selecionadas desta lista. Essa ação não pode ser desfeita.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "Isso removerá permanentemente {count} transação selecionada desta lista. Essa ação não pode ser desfeita.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_many": {
    message:
      "Isso removerá permanentemente {count} transações selecionadas desta lista. Essa ação não pode ser desfeita.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "Isso removerá permanentemente {count} transações selecionadas desta lista. Essa ação não pode ser desfeita.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Transações excluídas",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "{count} transações removidas desta lista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "{count} transação removida desta lista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_many": {
    message: "{count} transações removidas desta lista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "{count} transações removidas desta lista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Falha ao excluir",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "Não foi possível excluir as transações. Tente novamente.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "Instituição não encontrada",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "esta instituição",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "Selecione a transação {transaction}",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "Conexão cancelada",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "O link xadrez foi fechado.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "A conexão já existe",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "Você já tem uma conexão ativa com {institution}. Desvincule a conexão existente primeiro.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "Falha na conexão",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "Conectando…",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "Preparando…",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "Aguardando autorização…",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "Finalizando…",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "Banco reconectado",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "Sua conta bancária foi reconectada com sucesso.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "Falha na atualização de status",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "A reconexão foi bem-sucedida, mas não conseguiu atualizar o status. Atualize a página.",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "Reconexão cancelada",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "Plaid Link foi fechado sem reconectar.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "Falha na reconexão",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "Reconectando…",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "Atualizando status…",
    description: "Status while updating a reconnected bank",
  },
};

export default ptPlaid;
