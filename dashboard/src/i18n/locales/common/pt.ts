export interface TranslationEntry {
  message: string;
  description: string;
}

const ptCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Conta",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Transações",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Voltar",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Logo do Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Cancelar",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Limpar",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Fechar",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Limite de colaboradores",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Limite de colaboradores atingido",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Copiado",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Copiar",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Excluir",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.edit": {
    message: "Editar",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Encontramos um erro inesperado. Por favor, tente novamente ou volte para a página anterior.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Detalhes do erro",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Ocorreu um erro",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Algo deu errado",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Falha ao carregar dados",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Falha ao carregar o livro-razão",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Voltar",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Ir para início",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Ir para a próxima página",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Ir para a página anterior",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Importar",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Adicionar entrada",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transação, saldo ou nota",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Importação inteligente",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Extratos bancários, CSV, PDF ou digitalizações",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Conectar banco",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Sincronizar transações automaticamente",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Carregar recibo",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Digitalizar recibo com IA",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Parâmetros de URL inválidos",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Os parâmetros de URL fornecidos não são válidos. Por favor, verifique o link e tente novamente.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Última atualização",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Configurações do livro",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Limite de livros",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Limite de livros atingido",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "carregando...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Carregando dados...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Mais páginas",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Nome",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "perto do limite",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Falha na conexão de rede",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Não foi possível conectar ao servidor. Verifique sua conexão com a Internet e tente novamente.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Próximo",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Próximo",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Nenhum dado encontrado.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Nenhum resultado encontrado.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Outro",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Proprietário",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Página não encontrada",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "A página que você procura não existe ou foi movida para outro local.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "paginação",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Anterior",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Páginas relacionadas",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Salvar",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Salvando...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Páginas relacionadas",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Selecionar uma visualização",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Selecionar data",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Configurações",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Barra lateral",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Exibe a barra lateral móvel.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Estrelas",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Status",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Alternar barra lateral",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Tentar novamente",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "Ocorreu um erro inesperado ao carregar o livro-razão.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Desconhecido",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "atualizando...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Fazer upgrade para o Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Atualizar para desbloquear",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "usuario@exemplo.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Usuário",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Baixar",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Mais ações",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Saiba mais",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Visualize informações detalhadas da conta para {ledgerName}. Analise transações, saldos e histórico da conta.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Faça perguntas sobre os dados financeiros de {ledgerName} usando IA. Analise transações, explore saldos de contas, compreenda tendências e obtenha insights contábeis instantâneos.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Visualize o balanço patrimonial de {ledgerName}. Analise ativos, passivos e patrimônio líquido em qualquer momento.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "Visualize e gerencie commodities (moedas, ações e ativos) usadas em {ledgerName}. Acompanhe taxas de câmbio e histórico de preços.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Crie um novo arquivo em {ledgerName}. Adicione arquivos de livro-razão Beancount ou documentos ao seu repositório.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Navegue por documentos anexados às transações em {ledgerName}. Visualize recibos, faturas e documentação de suporte.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Visualize erros de análise e validação em {ledgerName}. Corrija problemas para garantir relatórios financeiros precisos.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Visualize eventos e marcos importantes em {ledgerName}. Acompanhe aberturas e fechamentos de contas e eventos do ciclo de vida.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Navegue e edite arquivos fonte do Beancount em {ledgerName}. Gerencie seu plano de contas e histórico de transações.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analise suas participações e portfólio atuais em {ledgerName}. Visualize alocação de ativos, valores de mercado e ganhos não realizados.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Adicione transações a {ledgerName} a partir de extratos bancários, planilhas ou recibos. Suporta CSV, PDF, OFX e imagens até 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Visualize receitas e despesas de {ledgerName}. Acompanhe receitas, custos e rentabilidade ao longo do tempo.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Navegue e filtre todas as transações em {ledgerName}. Pesquise por data, conta, descrição ou beneficiário.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Painel financeiro para {ledgerName}. Visualize saldos de contas, tendências de patrimônio líquido e resumos de receitas/despesas.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Execute consultas BQL (Beancount Query Language) em {ledgerName}. Filtre e analise seus dados financeiros com sintaxe semelhante a SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Configure ajustes para {ledgerName}. Gerencie moedas operacionais, colaboradores e configurações de privacidade.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Visualize estatísticas do livro-razão para {ledgerName}. Analise contagens de transações, uso de contas e métricas de qualidade de dados.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Visualize o balancete de verificação de {ledgerName}. Verifique se os débitos equivalem aos créditos em todas as contas.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Faça upload de arquivos para {ledgerName}. Importe arquivos ou documentos Beancount existentes.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Lançamentos",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Balanço Patrimonial",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.commodities": {
    message: "Commodities",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Criar arquivo",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Documentos",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Erros",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Eventos",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Arquivos",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Participações",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Importar",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Demonstração de Resultados",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Diário",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Visão Geral",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Consulta",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Estatísticas",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Balancete",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Enviar arquivos",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "Histórico de Versões",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Resultados",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Linhas",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Sucesso",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Ativos",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "Ao Custo",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "Ao Valor de Mercado",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Relatórios",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Avançado",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Ajuda e suporte",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Central de ajuda",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Consulte guias e documentação",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Suporte da comunidade",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Pergunte à comunidade no Telegram",
    description: "Description for the community support menu item",
  },
  "common.balanceSheet": {
    message: "Balanço Patrimonial",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Limpar all",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Convertido para",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Diário",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Patrimônio líquido",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Erro ao carregar dados",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Despesas",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Falha ao carregar opções de filtro",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Filtrar por tag, beneficiário, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Detalhamento de {ledgerName} {sectionName} com valores em USD e outras commodities",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Lista {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Hierarquia {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Representação visual da composição de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Renda",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "Demonstração de Resultados",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Passivos",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Lucro Líquido",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Patrimônio Líquido",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Nenhuma conta encontrada",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Pesquisar arquivos...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Nenhum arquivo encontrado",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Nenhum Dado Disponível",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "Nenhum dado para os filtros selecionados",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Nenhuma correspondência encontrada",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Visão Geral",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Por favor, tente novamente mais tarde",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Trimestral",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Pesquisar contas...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Selecionar conversão",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Selecionar período de tempo",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Tempo",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Balancete",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Digite para pesquisar...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Unidades",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Anual",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Conta",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Erro",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Sessão Expirada",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Sua sessão de login expirou. Faça login novamente para continuar.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Inicie sessão para continuar.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "Você não tem permissão para realizar esta ação.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "O recurso solicitado não foi encontrado.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Algumas informações fornecidas são inválidas. Verifique e tente novamente.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message: "A validação falhou. Verifique os dados e tente novamente.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Esta alteração entra em conflito com o estado atual. Atualize a página e tente novamente.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Muitas solicitações. Aguarde um momento e tente novamente.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Algo deu errado do nosso lado. Tente novamente mais tarde.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message:
      "O serviço está temporariamente indisponível. Tente novamente em instantes.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message: "Você atingiu o limite do seu plano. Faça upgrade para continuar.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Esta ação não é permitida.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Este recurso requer uma assinatura Premium.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Problema de conexão. Verifique sua conexão com a internet e tente novamente.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Algo deu errado. Tente novamente.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Algo deu errado",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "Não foi possível exibir esta seção. O restante da página deve continuar funcionando.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Copiar código",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Copiado para a área de transferência",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Falha ao copiar",
    description: "Toast when copying to the clipboard failed",
  },
};

export default ptCommon;
