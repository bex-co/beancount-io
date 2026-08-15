const ruFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Выровнять суммы",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Вы уверены, что хотите удалить "{filename}"? Это действие не может быть отменено.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Удалить файл",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Не удалось загрузить содержимое файла",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Файл успешно удалён",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Файл успешно сохранён",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Свернуть всё",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Уйти без сохранения",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Загрузка содержимого файла...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Остаться",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Переключить комментарий",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Развернуть всё",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Несохранённые изменения",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "У вас есть несохранённые изменения. Вы уверены, что хотите уйти? Ваши изменения будут потеряны.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Неподдерживаемый формат файла",
    description: "Message shown for files that cannot be displayed",
  },
};

export default ruFileEditor;
