export interface TranslationEntry {
  message: string;
  description: string;
}

const zhCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "管理员",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "权限",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "只读",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "写入",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "协作者添加成功",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "协作者移除成功",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "协作者",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "加载协作者时出错",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "添加协作者失败",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "移除协作者失败",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "成功退出账本",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "退出账本失败",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "退出账本",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "你确定要退出此账本吗？你将失去访问权限，需要再次被邀请才能恢复访问。",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "退出账本",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "邀请协作者",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "邀请协作者",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message: "搜索并选择用户以邀请他们作为此账本的协作者。",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "加入时间",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "无协作者",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "此账本尚无任何协作者。",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "无邮箱",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "未找到用户",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "移除协作者",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "你确定要移除",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "从此账本吗？此操作无法撤销。",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "搜索用户",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "搜索中...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "已选择用户",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "此用户",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "至少输入2个字符以开始搜索",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "输入以搜索用户...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "未知用户",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "用户",
    description: "Table column header for user",
  },
};

export default zhCollaboration;
