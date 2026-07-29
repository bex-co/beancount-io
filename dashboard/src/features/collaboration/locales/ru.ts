export interface TranslationEntry {
  message: string;
  description: string;
}

const ruCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Администратор",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Разрешение",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Чтение",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Запись",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Соавтор успешно добавлен",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Соавтор успешно удален",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Соавторы",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Ошибка загрузки соавторов",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Не удалось добавить соавтора",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Не удалось удалить соавтора",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Успешно покинул репозиторий",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Не удалось покинуть репозиторий",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "Покинуть Главную Книгу",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Вы уверены, что хотите покинуть эту главную книгу? Вы потеряете доступ, и вам нужно будет снова получить приглашение, чтобы восстановить его.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Покинуть Главную Книгу",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Пригласить соавтора",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Пригласить соавторов",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Найдите и выберите пользователей для приглашения в качестве соавторов этой книги.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Присоединился",
    description: "Table column header for join date",
  },
  "collaboration.lastActive": {
    message: "Последняя активность",
    description: "Table column header for last activity",
  },
  "collaboration.never": {
    message: "Никогда",
    description: "Label for never used or logged in",
  },
  "collaboration.noCollaborators": {
    message: "Нет соавторов",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "У этой книги пока нет соавторов.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "Нет email",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "Пользователи не найдены",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Удалить соавтора",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Вы уверены, что хотите удалить",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "из этой книги? Это действие не может быть отменено.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Поиск пользователей",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Поиск...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Выбранные пользователи",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "этого пользователя",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Введите не менее 2 символов для поиска",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Начните вводить для поиска пользователей...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownErrorOccurred": {
    message: "Произошла неизвестная ошибка",
    description: "Generic error message for unknown errors",
  },
  "collaboration.unknownUser": {
    message: "Неизвестный пользователь",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "Пользователь",
    description: "Table column header for user",
  },
};

export default ruCollaboration;
