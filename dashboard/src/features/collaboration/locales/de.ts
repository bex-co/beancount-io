export interface TranslationEntry {
  message: string;
  description: string;
}

const deCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Administrator",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Berechtigung",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Lesen",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Schreiben",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Mitarbeiter erfolgreich hinzugefügt",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Mitarbeiter erfolgreich entfernt",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Mitarbeiter",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Fehler beim Laden der Mitarbeiter",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Mitarbeiter konnte nicht hinzugefügt werden",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Mitarbeiter konnte nicht entfernt werden",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Erfolgreich aus dem Repository ausgetreten",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Fehler beim Verlassen des Repositorys",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Hauptbuch Verlassen",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Sind Sie sicher, dass Sie dieses Hauptbuch verlassen möchten? Sie verlieren den Zugriff und müssen erneut eingeladen werden, um wieder Zugriff zu erhalten.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Hauptbuch Verlassen",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Mitarbeiter einladen",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Mitarbeiter einladen",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Suchen und wählen Sie Benutzer aus, um sie als Mitarbeiter zu diesem Hauptbuch einzuladen.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Beigetreten",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "Keine Mitarbeiter",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Dieses Hauptbuch hat noch keine Mitarbeiter.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Keine E-Mail",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Keine Benutzer gefunden",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Mitarbeiter entfernen",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Sind Sie sicher, dass Sie",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message:
      "aus diesem Hauptbuch entfernen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Benutzer suchen",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Suche läuft...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Ausgewählte Benutzer",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "diesen Benutzer",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Geben Sie mindestens 2 Zeichen ein, um zu suchen",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Benutzer suchen...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "Unbekannter Benutzer",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Benutzer",
    description: "Table column header for user",
  },
};

export default deCollaboration;
