export interface TranslationEntry {
  message: string;
  description: string;
}

const ukCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Адміністратор",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Дозвіл",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Читання",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Запис",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Співробітника успішно додано",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Співробітника успішно видалено",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Співробітники",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Помилка Loading Collaborators",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Не вдалося додати співробітника",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Не вдалося видалити співробітника",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Успішно вийшли з репозиторію",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Не вдалося вийти з репозиторію",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Вийти з Головної Книги",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Ви впевнені, що хочете вийти з цієї головної книги? Ви втратите доступ, і вам потрібно буде знову отримати запрошення, щоб його відновити.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Вийти з Головної Книги",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Запросити співробітника",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Запросити співробітникаs",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Пошук and select users to invite as collaborators to this ledger.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Приєднався",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "Немає співробітників",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "У цій книзі ще немає співробітників.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Немає електронної пошти",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Користувачів не знайдено",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Видалити співробітника",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Ви впевнені, що хочете видалити",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "з цієї книги? Цю дію неможливо скасувати.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Пошук Users",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Пошукing...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Вибрані користувачі",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "цього користувача",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Тип at least 2 characters to search",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Тип to search users...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "Невідомий користувач",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Користувач",
    description: "Table column header for user",
  },
};

export default ukCollaboration;
