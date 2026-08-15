const zhFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "对齐金额",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message: '你确定要删除 "{filename}" 吗？此操作无法撤销。',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "删除文件",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "加载文件内容失败",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "文件删除成功",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "文件保存成功",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "全部折叠",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "放弃保存并离开",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "加载文件内容中...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "留下",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "切换注释",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "全部展开",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "未保存的更改",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message: "你有未保存的更改。确定要离开吗？你的更改将丢失。",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "不支持的文件格式",
    description: "Message shown for files that cannot be displayed",
  },
};

export default zhFileEditor;
