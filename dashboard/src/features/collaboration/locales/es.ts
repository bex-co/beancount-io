export interface TranslationEntry {
  message: string;
  description: string;
}

const esCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Administrador",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Permiso",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Lectura",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Escritura",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Colaborador agregado exitosamente",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Colaborador eliminado exitosamente",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Colaboradores",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Error al Cargar Colaboradores",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Error al agregar colaborador",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Error al eliminar colaborador",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Saliste del repositorio exitosamente",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Error al salir del repositorio",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Salir del Libro Mayor",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "¿Estás seguro de que quieres salir de este libro mayor? Perderás el acceso y necesitarás ser invitado nuevamente para recuperarlo.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Salir del Libro Mayor",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Invitar Colaborador",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Invitar Colaboradores",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Busque y seleccione usuarios para invitar como colaboradores a este libro mayor.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Se unió",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "Sin Colaboradores",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Este libro mayor aún no tiene colaboradores.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Sin correo electrónico",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "No se encontraron usuarios",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Eliminar Colaborador",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "¿Está seguro de que desea eliminar a",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "de este libro mayor? Esta acción no se puede deshacer.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Buscar Usuarios",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Buscando...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Usuarios Seleccionados",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "este usuario",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Escriba al menos 2 caracteres para buscar",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Escriba para buscar usuarios...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "Usuario Desconocido",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Usuario",
    description: "Table column header for user",
  },
};

export default esCollaboration;
