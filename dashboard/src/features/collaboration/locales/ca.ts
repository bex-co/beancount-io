export interface TranslationEntry {
  message: string;
  description: string;
}

const caCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Administrador",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Permís",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Lectura",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Escriptura",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Col·laborador afegit correctament",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Col·laborador eliminat correctament",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Col·laboradors",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Error en carregar els col·laboradors",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Error en afegir el col·laborador",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Error en eliminar el col·laborador",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Has sortit del repositori correctament",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Error en sortir del repositori",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Sortir del Llibre Major",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Esteu segur que voleu sortir d'aquest llibre major? Perdreu l'accés i haureu de ser convidats de nou per recuperar l'accés.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Sortir del Llibre Major",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Convidar col·laborador",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Convidar col·laboradors",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Cerqueu i seleccioneu usuaris per convidar com a col·laboradors d'aquest llibre.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "S'ha unit",
    description: "Table column header for join date",
  },
  "collaboration.lastActive": {
    message: "Última activitat",
    description: "Table column header for last activity",
  },
  "collaboration.never": {
    message: "Mai",
    description: "Label for never used or logged in",
  },
  "collaboration.noCollaborators": {
    message: "Sense col·laboradors",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Aquest llibre encara no té cap col·laborador.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Sense correu electrònic",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "No s'han trobat usuaris",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Eliminar col·laborador",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Esteu segur que voleu eliminar",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "d'aquest llibre? Aquesta acció no es pot desfer.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Cercar usuaris",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Cercant...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Usuaris seleccionats",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "aquest usuari",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Escriviu almenys 2 caràcters per cercar",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Escriviu per cercar usuaris...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownErrorOccurred": {
    message: "S'ha produït un error desconegut",
    description: "Generic error message for unknown errors",
  },
  "collaboration.unknownUser": {
    message: "Usuari desconegut",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Usuari",
    description: "Table column header for user",
  },
};

export default caCollaboration;
