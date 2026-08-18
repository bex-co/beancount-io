export interface TranslationEntry {
  message: string;
  description: string;
}

const ptDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Atualizações Recentes",
    description: "Title for blog feed section on dashboard",
  },
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
    message: "Excluir Ledger",
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
    message: "Editar Ledger",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Editar Ledger Settings",
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
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "Não foi possível recuperar seus livros-razão. Verifique sua conexão e tente novamente.",
    description: "Detailed error description for ledger loading failure",
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
  "page.dashboard.manageLedgersDescription": {
    message:
      "Gerencie seus livros-razão Beancount. Clique em um livro-razão para ver seus detalhes.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "O nome deve conter pelo menos uma letra ou número",
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
  "page.dashboard.noFeedItems": {
    message: "Nenhum item de feed disponível",
    description: "Empty state message when no feed items exist",
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
    description: "Aria label for ledger switcher button",
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
};

export default ptDashboardPage;
