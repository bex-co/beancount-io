export interface TranslationEntry {
  message: string;
  description: string;
}

const frCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Administrateur",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Permission",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Lecture",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Écriture",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Collaborateur ajouté avec succès",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Collaborateur supprimé avec succès",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Collaborateurs",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Erreur lors du chargement des collaborateurs",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Échec de l'ajout du collaborateur",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Échec de la suppression du collaborateur",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Sortie du dépôt réussie",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Échec de la sortie du dépôt",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Quitter le Registre",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Êtes-vous sûr de vouloir quitter ce registre ? Vous perdrez l'accès et devrez être invité à nouveau pour le retrouver.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Quitter le Registre",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Inviter un collaborateur",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Inviter des collaborateurs",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Recherchez et sélectionnez des utilisateurs à inviter en tant que collaborateurs de ce grand livre.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Inscrit",
    description: "Table column header for join date",
  },
  "collaboration.lastActive": {
    message: "Dernière activité",
    description: "Table column header for last activity",
  },
  "collaboration.never": {
    message: "Jamais",
    description: "Label for never used or logged in",
  },
  "collaboration.noCollaborators": {
    message: "Aucun collaborateur",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Ce grand livre n'a pas encore de collaborateurs.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Aucun e-mail",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Aucun utilisateur trouvé",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Retirer le collaborateur",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Êtes-vous sûr de vouloir retirer",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "de ce grand livre ? Cette action ne peut pas être annulée.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Rechercher des utilisateurs",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Recherche en cours...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Utilisateurs sélectionnés",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "cet utilisateur",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Tapez au moins 2 caractères pour rechercher",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Tapez pour rechercher des utilisateurs...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownErrorOccurred": {
    message: "Une erreur inconnue s'est produite",
    description: "Generic error message for unknown errors",
  },
  "collaboration.unknownUser": {
    message: "Utilisateur inconnu",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Utilisateur",
    description: "Table column header for user",
  },
};

export default frCollaboration;
