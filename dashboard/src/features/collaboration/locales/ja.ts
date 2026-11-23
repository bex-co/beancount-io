import type { TranslationEntry } from "@/i18n";

const jaCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "管理者",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "権限",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "読み取り",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "書き込み",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess_other": {
    message: "共同編集者を {count} 人追加しました",
    description: "Number of collaborators successfully added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "コラボレーターが正常に削除されました",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "コラボレーター",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "コラボレーターの読み込みエラー",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.ownerPlanLimitReached": {
    message:
      "この台帳の所有者のプランでは、これ以上コラボレーターを追加できません。追加するには所有者がアップグレードする必要があります。",
    description:
      "Shown when adding a collaborator to someone else's ledger hits the owner's plan limit; only the owner can upgrade.",
  },
  "collaboration.failedToAddCollaborator": {
    message: "コラボレーターの追加に失敗しました",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "コラボレーターの削除に失敗しました",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "リポジトリから正常に退出しました",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "リポジトリからの退出に失敗しました",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "レジャーを退出",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "このレジャーを退出してよろしいですか？アクセス権を失い、再びアクセスするには再招待が必要になります。",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "レジャーを退出",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "コラボレーターを招待",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "コラボレーターを招待",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "このレジャーのコラボレーターとして招待するユーザーを検索して選択してください。",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "参加日",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "コラボレーターなし",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "このレジャーにはまだコラボレーターがいません。",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "メールなし",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "ユーザーが見つかりません",
    description: "Message when search returns no results",
  },
  "collaboration.removeSelectedUser": {
    message: "{username} を削除",
    description:
      "Accessible name for removing a user from the invite selection",
  },
  "collaboration.removeCollaborator": {
    message: "コラボレーターを削除",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "本当に削除してよろしいですか",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "をこのレジャーから？この操作は元に戻せません。",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "ユーザーを検索",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "検索中...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "選択したユーザー",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "このユーザー",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "検索するには2文字以上入力してください",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "ユーザーを検索する...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "不明なユーザー",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "ユーザー",
    description: "Table column header for user",
  },
};

export default jaCollaboration;
