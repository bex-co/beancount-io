const jaFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message: "{filename} は元帳のルートファイルのため削除できません",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message:
      "{filename} のダウンロードを準備できませんでした。もう一度お試しください。",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
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
  "ledgerEditor.deleteFileIncluded": {
    message:
      "ファイル「{filename}」は {includers} から読み込まれています。読み込みを削除してファイルも削除しますか？この操作は元に戻せません。",
    description:
      "Confirmation shown when a file other ledger files still include is deleted; {filename} is the file, {includers} the files that include it",
  },
  "ledgerEditor.deleteFileRemoveInclude": {
    message: "読み込みを削除して削除",
    description:
      "Button that deletes a file and also removes the include lines that point at it",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "ファイルの内容の読み込みに失敗しました",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "ファイルが見つかりません: {path}",
    description:
      "台帳のファイルパスが存在しないときのメッセージ（{path} を含む）",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "親ディレクトリを開く",
    description: "欠落ファイルの後に親の Files ディレクトリを開くボタン",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "ファイルが正常に削除されました",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "ファイルが正常に保存されました",
    description: "Success message when file is saved",
  },
  "ledgerEditor.saveConflict": {
    message:
      "開いた後にこのファイルが変更されたため、編集は保存されませんでした。編集内容をコピーしてから最新版を読み込み、そこに反映してください。",
    description:
      "Inline notice when a file save was refused because another write changed the file since it was opened",
  },
  "ledgerEditor.copyMyEdit": {
    message: "編集内容をコピー",
    description:
      "Copies the unsaved file edit to the clipboard after a conflicting save",
  },
  "ledgerEditor.loadLatest": {
    message: "最新版を読み込む",
    description:
      "Opens a confirmation to replace the unsaved edit with the file's latest revision",
  },
  "ledgerEditor.loadLatestTitle": {
    message: "編集内容を最新版で置き換えますか？",
    description:
      "Title of the confirmation before replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.loadLatestDescription": {
    message:
      "エディターには現在のファイルが表示されます。コピーしていない場合、保存していない編集内容は失われます。",
    description:
      "Explains that loading the latest revision replaces the unsaved edit",
  },
  "ledgerEditor.loadLatestConfirm": {
    message: "編集内容を置き換える",
    description: "Confirms replacing the unsaved edit with the latest revision",
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
