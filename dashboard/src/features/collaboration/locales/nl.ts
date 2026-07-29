export interface TranslationEntry {
  message: string;
  description: string;
}

const nlCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Beheerder",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Machtiging",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Lezen",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Schrijven",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Medewerker succesvol toegevoegd",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Medewerker succesvol verwijderd",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Medewerkers",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Fout bij laden medewerkers",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Medewerker toevoegen mislukt",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Medewerker verwijderen mislukt",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Succesvol de repository verlaten",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Repository verlaten mislukt",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Grootboek Verlaten",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Weet u zeker dat u dit grootboek wilt verlaten? U verliest toegang en moet opnieuw worden uitgenodigd om weer toegang te krijgen.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Grootboek Verlaten",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Medewerker uitnodigen",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Medewerkers uitnodigen",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Zoek en selecteer gebruikers om uit te nodigen als medewerkers voor dit grootboek.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Toegetreden",
    description: "Table column header for join date",
  },
  "collaboration.lastActive": {
    message: "Laatst actief",
    description: "Table column header for last activity",
  },
  "collaboration.never": {
    message: "Nooit",
    description: "Label for never used or logged in",
  },
  "collaboration.noCollaborators": {
    message: "Geen medewerkers",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Dit grootboek heeft nog geen medewerkers.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Geen e-mail",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Geen gebruikers gevonden",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Medewerker verwijderen",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Weet u zeker dat u wilt verwijderen",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "van dit grootboek? Deze actie kan niet ongedaan gemaakt worden.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Gebruikers zoeken",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Zoeken...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Geselecteerde gebruikers",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "deze gebruiker",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Typ minimaal 2 tekens om te zoeken",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Typ om gebruikers te zoeken...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownErrorOccurred": {
    message: "Er is een onbekende fout opgetreden",
    description: "Generic error message for unknown errors",
  },
  "collaboration.unknownUser": {
    message: "Onbekende gebruiker",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Gebruiker",
    description: "Table column header for user",
  },
};

export default nlCollaboration;
