import type { TranslationEntry } from "@/i18n";

const koCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "관리자",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "권한",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "읽기",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "쓰기",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "협력자가 성공적으로 추가되었습니다",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "협력자가 성공적으로 삭제되었습니다",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "협력자",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "협력자 로딩 오류",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "협력자 추가에 실패했습니다",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "협력자 삭제에 실패했습니다",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "저장소에서 성공적으로 나갔습니다",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "저장소 나가기에 실패했습니다",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "원장 나가기",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "이 원장에서 나가시겠습니까? 접근 권한을 잃게 되며, 다시 접근하려면 다시 초대받아야 합니다.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "원장 나가기",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "협력자 초대",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "협력자 초대",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message: "이 장부의 협력자로 초대할 사용자를 검색하고 선택하세요.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "가입일",
    description: "Table column header for join date",
  },
  "collaboration.lastActive": {
    message: "마지막 활동",
    description: "Table column header for last activity",
  },
  "collaboration.never": {
    message: "없음",
    description: "Label for never used or logged in",
  },
  "collaboration.noCollaborators": {
    message: "협력자 없음",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "이 장부에는 아직 협력자가 없습니다.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "이메일 없음",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "사용자를 찾을 수 없습니다",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "협력자 삭제",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "정말 삭제하시겠습니까",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "을(를) 이 장부에서? 이 작업은 되돌릴 수 없습니다.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "사용자 검색",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "검색 중...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "선택한 사용자",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "이 사용자",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "검색하려면 2자 이상 입력하세요",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "사용자 검색...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownErrorOccurred": {
    message: "알 수 없는 오류가 발생했습니다",
    description: "Generic error message for unknown errors",
  },
  "collaboration.unknownUser": {
    message: "알 수 없는 사용자",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "사용자",
    description: "Table column header for user",
  },
};

export default koCollaboration;
