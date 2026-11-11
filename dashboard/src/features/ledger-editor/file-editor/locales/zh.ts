const zhFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message: "{filename} 是账本的根文件，无法删除",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message: "无法准备 {filename} 的下载，请重试。",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
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
  "ledgerEditor.deleteFileIncluded": {
    message:
      "文件“{filename}”被 {includers} 引用。要移除引用并删除该文件吗？此操作无法撤销。",
    description:
      "Confirmation shown when a file other ledger files still include is deleted; {filename} is the file, {includers} the files that include it",
  },
  "ledgerEditor.deleteFileRemoveInclude": {
    message: "移除引用并删除",
    description:
      "Button that deletes a file and also removes the include lines that point at it",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "加载文件内容失败",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "未找到文件：{path}",
    description: "账本文件路径不存在时的提示（含 {path}）",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "浏览上级目录",
    description: "缺失文件后打开上级 Files 目录的按钮",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "文件删除成功",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "文件保存成功",
    description: "Success message when file is saved",
  },
  "ledgerEditor.saveConflict": {
    message:
      "此文件在你打开后已被修改，因此你的编辑未保存。请先复制你的编辑，再加载最新版本并在其中重新修改。",
    description:
      "Inline notice when a file save was refused because another write changed the file since it was opened",
  },
  "ledgerEditor.copyMyEdit": {
    message: "复制我的编辑",
    description:
      "Copies the unsaved file edit to the clipboard after a conflicting save",
  },
  "ledgerEditor.loadLatest": {
    message: "加载最新版本",
    description:
      "Opens a confirmation to replace the unsaved edit with the file's latest revision",
  },
  "ledgerEditor.loadLatestTitle": {
    message: "用最新版本替换你的编辑？",
    description:
      "Title of the confirmation before replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.loadLatestDescription": {
    message:
      "编辑器将显示文件的当前内容。如果你没有复制，未保存的编辑将会丢失。",
    description:
      "Explains that loading the latest revision replaces the unsaved edit",
  },
  "ledgerEditor.loadLatestConfirm": {
    message: "替换我的编辑",
    description: "Confirms replacing the unsaved edit with the latest revision",
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
