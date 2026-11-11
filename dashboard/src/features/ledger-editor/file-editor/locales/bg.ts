const bgFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message: "{filename} е основният файл на книгата и не може да бъде изтрит",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message:
      "{filename} не можа да бъде подготвен за изтегляне. Опитайте отново.",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
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
  "ledgerEditor.deleteFileIncluded": {
    message:
      "Файлът „{filename}“ е включен от {includers}. Да се премахне включването и да се изтрие файлът? Действието не може да бъде отменено.",
    description:
      "Confirmation shown when a file other ledger files still include is deleted; {filename} is the file, {includers} the files that include it",
  },
  "ledgerEditor.deleteFileRemoveInclude": {
    message: "Премахни включването и изтрий",
    description:
      "Button that deletes a file and also removes the include lines that point at it",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Неуспешно зареждане на съдържанието на файла",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "Файлът не е намерен: {path}",
    description:
      "Съобщение, когато пътят към файл в регистъра не съществува (съдържа {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Преглед на родителската директория",
    description:
      "Бутон за отваряне на родителската директория Files след липсващ файл",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Файлът е изтрит успешно",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Файлът е запазен успешно",
    description: "Success message when file is saved",
  },
  "ledgerEditor.saveConflict": {
    message:
      "Файлът е променен, откакто го отворихте, затова редакцията ви не беше запазена. Копирайте я, след това заредете най-новата версия и я приложете там.",
    description:
      "Inline notice when a file save was refused because another write changed the file since it was opened",
  },
  "ledgerEditor.copyMyEdit": {
    message: "Копирай редакцията ми",
    description:
      "Copies the unsaved file edit to the clipboard after a conflicting save",
  },
  "ledgerEditor.loadLatest": {
    message: "Зареди най-новата",
    description:
      "Opens a confirmation to replace the unsaved edit with the file's latest revision",
  },
  "ledgerEditor.loadLatestTitle": {
    message: "Да се замени ли редакцията ви с най-новата версия?",
    description:
      "Title of the confirmation before replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.loadLatestDescription": {
    message:
      "Редакторът ще покаже файла в сегашния му вид. Незапазената ви редакция ще бъде загубена, освен ако не сте я копирали.",
    description:
      "Explains that loading the latest revision replaces the unsaved edit",
  },
  "ledgerEditor.loadLatestConfirm": {
    message: "Замени редакцията ми",
    description: "Confirms replacing the unsaved edit with the latest revision",
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
