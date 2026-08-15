const bgFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Подравняване на суми",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Сигурни ли сте, че искате да изтриете "{filename}"? Това действие не може да бъде отменено.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Изтриване на файл",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Неуспешно зареждане на съдържанието на файла",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Файлът е изтрит успешно",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Файлът е запазен успешно",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Сгъване на всички",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Излез без запазване",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Зареждане на съдържанието на файла...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Остани",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Превключване на коментар",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Разгъване на всички",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Незапазени промени",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "Имате незапазени промени. Сигурни ли сте, че искате да излезете? Промените ще бъдат загубени.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Неподдържан формат на файла",
    description: "Message shown for files that cannot be displayed",
  },
};

export default bgFileEditor;
