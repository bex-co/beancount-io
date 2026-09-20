const ukFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Вирівняти суми",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Ви впевнені, що хочете видалити "{filename}"? Цю дію неможливо скасувати.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Видалити файл",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Не вдалося завантажити вміст файлу",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "Файл не знайдено: {path}",
    description:
      "Повідомлення, коли шлях до файлу книги не існує (містить {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Відкрити батьківський каталог",
    description:
      "Кнопка відкриття батьківського каталогу Files після відсутнього файлу",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Файл успішно видалено",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Файл успішно збережено",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Згорнути все",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Вийти без збереження",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Завантаження вмісту файлу...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Залишитися",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Перемкнути коментар",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Розгорнути все",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Незбережені зміни",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "У вас є незбережені зміни. Ви впевнені, що хочете вийти? Ваші зміни буде втрачено.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Непідтримуваний формат файлу",
    description: "Message shown for files that cannot be displayed",
  },
};

export default ukFileEditor;
