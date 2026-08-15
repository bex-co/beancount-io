export interface TranslationEntry {
  message: string;
  description: string;
}

const skCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Admin",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Oprávnenie",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Čítanie",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Zápis",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Spolupracovník bol úspešne pridaný",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Spolupracovník bol úspešne odstránený",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Spolupracovníci",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Chyba pri načítaní spolupracovníkov",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Pridanie spolupracovníka zlyhalo",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Odstránenie spolupracovníka zlyhalo",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Úspešne ste opustili úložisko",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Opustenie úložiska zlyhalo",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Opustiť Hlavnú Knihu",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Naozaj chcete opustiť túto hlavnú knihu? Stratíte prístup a budete musieť byť znovu pozvaní, aby ste ho obnovili.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Opustiť Hlavnú Knihu",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Pozvať spolupracovníka",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Pozvať spolupracovníkov",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Vyhľadajte a vyberte používateľov, ktorých chcete pozvať ako spolupracovníkov tejto knihy.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Pripojil sa",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "Žiadni spolupracovníci",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Táto kniha zatiaľ nemá žiadnych spolupracovníkov.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Bez e-mailu",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Nenašli sa žiadni používatelia",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Odstrániť spolupracovníka",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Ste si istí, že chcete odstrániť",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "z tejto knihy? Túto akciu nie je možné vrátiť späť.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Hľadať používateľov",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Hľadám...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Vybraní používatelia",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "tento používateľ",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Zadajte aspoň 2 znaky pre vyhľadávanie",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Začnite písať pre vyhľadávanie používateľov...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "Neznámy používateľ",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Používateľ",
    description: "Table column header for user",
  },
};

export default skCollaboration;
