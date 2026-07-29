export interface TranslationEntry {
  message: string;
  description: string;
}

const ptCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Administrador",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Permissão",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Leitura",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Escrita",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Colaborador adicionado com sucesso",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Colaborador removido com sucesso",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Colaboradores",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Erro ao Carregar Colaboradores",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Falha ao adicionar colaborador",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Falha ao remover colaborador",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Saiu do repositório com sucesso",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Falha ao sair do repositório",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Sair do Livro-razão",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Tem certeza de que deseja sair deste livro-razão? Você perderá o acesso e precisará ser convidado novamente para recuperá-lo.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Sair do Livro-razão",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Convidar Colaborador",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Convidar Colaboradores",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Pesquise e selecione usuários para convidar como colaboradores deste livro-razão.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Entrou em",
    description: "Table column header for join date",
  },
  "collaboration.lastActive": {
    message: "Última Atividade",
    description: "Table column header for last activity",
  },
  "collaboration.never": {
    message: "Nunca",
    description: "Label for never used or logged in",
  },
  "collaboration.noCollaborators": {
    message: "Nenhum Colaborador",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Este livro-razão ainda não tem colaboradores.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Sem e-mail",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Nenhum usuário encontrado",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Remover Colaborador",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Tem certeza de que deseja remover",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "deste livro-razão? Esta ação não pode ser desfeita.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Pesquisar Usuários",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Pesquisando...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Usuários Selecionados",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "este usuário",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Digite pelo menos 2 caracteres para pesquisar",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Digite para pesquisar usuários...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownErrorOccurred": {
    message: "Ocorreu um erro desconhecido",
    description: "Generic error message for unknown errors",
  },
  "collaboration.unknownUser": {
    message: "Usuário Desconhecido",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Usuário",
    description: "Table column header for user",
  },
};

export default ptCollaboration;
