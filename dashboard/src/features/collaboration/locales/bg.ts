export interface TranslationEntry {
  message: string;
  description: string;
}

const bgCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Администратор",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Разрешение",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Четене",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Запис",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Сътрудникът е добавен успешно",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Сътрудникът е премахнат успешно",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Сътрудници",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Грешка при зареждане на сътрудниците",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Неуспешно добавяне на сътрудник",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Неуспешно премахване на сътрудник",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Успешно напуснахте хранилището",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Неуспешно напускане на хранилището",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Напускане на Главната Книга",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Сигурни ли сте, че искате да напуснете тази главна книга? Ще загубите достъп и ще трябва да бъдете поканени отново, за да възстановите достъпа.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Напускане на Главната Книга",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Покани сътрудник",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Покани сътрудници",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Потърсете и изберете потребители, които да поканите като сътрудници на тази книга.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Присъединен",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "Няма сътрудници",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "Тази книга все още няма сътрудници.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Без имейл",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Няма намерени потребители",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Премахване на сътрудник",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Сигурни ли сте, че искате да премахнете",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "от тази книга? Това действие не може да бъде отменено.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Търсене на потребители",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Търсене...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Избрани потребители",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "този потребител",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Въведете поне 2 символа за търсене",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Въведете за търсене на потребители...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "Неизвестен потребител",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Потребител",
    description: "Table column header for user",
  },
};

export default bgCollaboration;
