export interface TranslationEntry {
  message: string;
  description: string;
}

const ptDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Criar Livro-Razão",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Criar Novo Livro-Razão",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Crie um novo livro-razão Beancount para começar a gerenciar suas finanças.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Painel",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Ir para o painel",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Excluir livro",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Tem certeza de que deseja excluir "{name}"? Esta ação não pode ser desfeita.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Excluindo...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Descrição (Opcional)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Editar livro",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Editar configurações do livro",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Digite a descrição",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Digite o nome do livro-razão",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Falha ao carregar o livro-razãos",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Falha ao carregar o feed",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Livro-razão criado com sucesso",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Livro-razão excluído com sucesso",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Você atingiu seu limite de livros-razão. Faça upgrade para criar mais livros.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Nome do Livro-Razão",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Configurações de {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Livro-razão atualizado com sucesso",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Carregando livros-razão...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Gerencie seus livros-razão Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Use pelo menos uma letra latina (A–Z) ou um dígito: o nome se torna o endereço web do livro.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "O nome deve ter menos de 100 caracteres",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Nome é obrigatório",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Livro pessoal",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "Registre uma compra e entenda seu efeito no dinheiro restante.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Livro de freelancer",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Registre receitas de clientes ou veja o que um cliente inadimplente ainda deve.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Livro de empresa",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Estabeleça uma posição inicial e distinga financiamento de receita.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Livro de carteira",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Registre uma compra e verifique unidades, aquisições e movimentação de caixa.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Livro de aluguel",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "Registre recibos e distinga aluguel de um depósito reembolsável.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Livro de despesas compartilhadas",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Registre um adiantamento e veja quem deve a quem.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Livro de comunidade",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Explique contribuições, gastos de projetos e fundos restantes.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Livro em branco",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Adicione uma estrutura escolhida sem remover categorias indesejadas.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Insira um valor como 100 ou -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Moeda de operação",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Os livros começam em",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Conta de abertura",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Saldo inicial (opcional)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Decidir depois",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Revisar",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "É exatamente isto que será criado. Volte para alterar algo.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Contas",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Passo {step} de {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Nenhum livro-razão encontrado",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "Crie seu primeiro livro-razão para começar a acompanhar suas finanças.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Privado",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Somente você e colaboradores podem acessar",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Público",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message:
      "Qualquer pessoa com o link pode visualizar seus dados financeiros",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Nome do repositório",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Tentar Novamente",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Pesquisar livros-razão...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Selecione um livro-razão",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — trocar de livro-razão",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Mostrar Mais",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Atualize os detalhes do seu livro-razão.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Seus Livros-Razão",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Ir para a conta de {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Atividade",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "As alterações aos seus livros aparecem aqui.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Alterações em todos os livros que consegue ver",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "Não foi possível atualizar a atividade. Mostrando a que foi carregada antes.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default ptDashboardPage;
