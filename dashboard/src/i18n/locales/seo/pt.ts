export interface TranslationEntry {
  message: string;
  description: string;
}

const ptSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Concluindo sua entrada no Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Entrando",
    description: "Auth callback page title",
  },
  "seo.deviceAuth.description": {
    message: "Authorize CLI access to your Beancount account.",
    description: "Device auth page meta description",
  },
  "seo.deviceAuth.title": {
    message: "Authorize CLI Access",
    description: "Device auth page title",
  },
  "seo.dashboard.description": {
    message:
      "Seu painel Beancount. Acesse seus livros-razão e gerencie seus dados financeiros.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Painel",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "Ocorreu um erro ao carregar esta página. Por favor, tente novamente ou volte à página inicial.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Erro",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Redefina sua senha do Beancount.io com segurança. Enviaremos um link único — depois volte aos seus livros.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Redefinir senha do Beancount — Acesso seguro e recuperação",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Contabilidade profissional em texto simples com Beancount. Acompanhe finanças, gerencie livros-razão e gere relatórios com contabilidade poderosa, precisa e auditável.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Contabilidade em Texto Simples",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Detalhes da conta e histórico de transações de {accountName} em {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Faça perguntas sobre os dados financeiros de {ledgerName} usando IA. Analise transações, explore saldos de contas, compreenda tendências e obtenha insights contábeis instantâneos.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Perguntar sobre {ledgerName} - Assistente financeiro IA",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Relatório de balanço patrimonial de {ledgerName}. Visualize ativos, passivos e patrimônio líquido rapidamente.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Balanço Patrimonial - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Lista de commodities e preços de {ledgerName}. Acompanhe moedas, ações e outros ativos.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Commodities - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Visualize o histórico de commits e controle de versão de {ledgerName}. Acompanhe as alterações nos seus arquivos contábeis.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Commits - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerCommit.description": {
    message:
      "Changes in commit {shortSha} for {ledgerName}. Review modified files and diffs.",
    description: "Commit detail page meta description",
  },
  "seo.ledgerCommit.title": {
    message: "Commit {shortSha} - {ledgerName}",
    description: "Commit detail page title with short hash and ledger name",
  },

  "seo.ledgerDashboard.description": {
    message:
      "Visualize e gerencie todos os seus livros-razão Beancount. Crie novos livros-razão, acesse os existentes e organize seus registros financeiros.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Meus Livros-Razão",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Anexos de documentos e recibos de {ledgerName}. Organize arquivos de suporte para suas transações.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Documentos - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Erros de validação e avisos de {ledgerName}. Revise e corrija problemas no seu livro-razão.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Erros - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Linha do tempo de eventos de {ledgerName}. Acompanhe eventos financeiros importantes e marcos.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Eventos - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Explore os arquivos contábeis Beancount de {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Arquivos - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Crie um novo arquivo em {ledgerName}. Adicione contas, transações ou outras entradas Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Criar Arquivo - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Envie arquivos para {ledgerName}. Importe arquivos ou documentos Beancount existentes.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Enviar Arquivos - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Navegue por exemplos e modelos públicos de livros-razão Beancount. Encontre inspiração para sua própria configuração de rastreamento financeiro.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Galeria de Livros-Razão",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Participações de investimento e carteira de {ledgerName}. Visualize posições atuais e avaliações.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Participações - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Importe transações para {ledgerName} a partir de CSV, PDF, OFX ou imagens. Análise com IA para extratos bancários e recibos.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Importação inteligente - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Relatório de demonstração de resultados de {ledgerName}. Acompanhe receita, despesas e lucro líquido ao longo do tempo.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Demonstração de Resultados - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Diário de transações de {ledgerName}. Visualize, pesquise e filtre todos os seus lançamentos contábeis.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Diário - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Visão geral financeira e relatórios de {ledgerName}. Visualize patrimônio líquido, receita, despesas e distribuição de ativos.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Visão Geral - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Revise as alterações do pull request para {ledgerName}. Aprove ou rejeite as modificações propostas no seu livro-razão.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Conecte contas bancárias ao {ledgerName} usando Plaid. Importe transações automaticamente e sincronize dados financeiros.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Contas conectadas - {ledgerName}",
    description: "Plaid settings page title with ledger name",
  },
  "seo.plaidConnections.description": {
    message:
      "Manage your connected bank accounts for {ledgerName} — link new banks, update account mappings, sync, or disconnect.",
    description: "Plaid connections management page meta description",
  },
  "seo.plaidConnections.title": {
    message: "Manage Bank Connections - {ledgerName}",
    description: "Plaid connections management page title with ledger name",
  },
  "seo.ledgerQuery.description": {
    message:
      "Consulte {ledgerName} com sintaxe BQL. Execute consultas personalizadas e analise seus dados financeiros.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "Consulta BQL - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Configure ajustes do livro {ledgerName}. Gerencie preferências, acesso e opções do livro-razão.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Configurações do livro - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Análise estatística de {ledgerName}. Visualize métricas, tendências e insights dos seus dados financeiros.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Estatísticas - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Relatório de balancete de verificação de {ledgerName}. Verifique a igualdade de débitos e créditos nas suas contas.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Balancete de Verificação - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Entre no Beancount.io — contabilidade em texto simples open-source com Git. Gerencie livros, importe bancos e mantenha seus livros auditáveis.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Entrar no Beancount — Contabilidade em texto simples grátis",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Saindo da sua conta Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Sair",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "A página que você está procurando não existe. Ela pode ter sido movida ou excluída.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Página não encontrada",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Crie uma nova senha para sua conta Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Redefinir Senha",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Atualize suas informações de perfil, preferências de idioma e configurações gerais da conta.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Configurações Gerais",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Gerencie chaves SSH para acesso seguro aos seus livros-razão Beancount via Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "Chaves SSH",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Zona de perigo",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Gerencie ações destrutivas da conta como excluir permanentemente sua conta e todos os dados.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Crie sua conta gratuita no Beancount.io. Acompanhe suas finanças com livros em texto simples, relatórios Fava, importação bancária e controle de versão — sem dependência.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Criar conta gratuita no Beancount — Contabilidade com Git",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Verifique seu endereço de e-mail para concluir o registro da sua conta Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Verificar E-mail",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Bem-vindo to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Bem-vindo",
    description: "Welcome page title",
  },
};

export default ptSeo;
