const jaFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "金額を整列",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message: '"{filename}"を削除しますか？この操作は元に戻せません。',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "ファイルを削除",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToDeleteFile": {
    message: "ファイルの削除に失敗しました",
    description: "Error message when file deletion fails",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "ファイルの内容の読み込みに失敗しました",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "ファイルが正常に削除されました",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "ファイルが正常に保存されました",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "すべて折りたたむ",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "保存せずに移動",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "ファイルの内容を読み込み中...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "留まる",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "コメントの切り替え",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "すべて展開",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "未保存の変更",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message: "未保存の変更があります。移動しますか？変更は失われます。",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "サポートされていないファイル形式",
    description: "Message shown for files that cannot be displayed",
  },
};

export default jaFileEditor;
