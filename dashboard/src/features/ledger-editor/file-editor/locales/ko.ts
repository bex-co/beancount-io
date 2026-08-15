const koFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "금액 정렬",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      '"{filename}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "파일 삭제",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "파일 내용 불러오기 실패",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "파일이 성공적으로 삭제되었습니다",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "파일이 성공적으로 저장되었습니다",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "모두 접기",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "저장하지 않고 떠나기",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "파일 내용 불러오는 중...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "머물기",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "주석 전환",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "모두 펼치기",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "저장되지 않은 변경 사항",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "저장되지 않은 변경 사항이 있습니다. 정말 떠나시겠습니까? 변경 사항이 손실됩니다.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "지원되지 않는 파일 형식",
    description: "Message shown for files that cannot be displayed",
  },
};

export default koFileEditor;
