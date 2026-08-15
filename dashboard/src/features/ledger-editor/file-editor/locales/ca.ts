const caFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Alinear imports",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Esteu segur que voleu eliminar "{filename}"? Aquesta acció no es pot desfer.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Eliminar fitxer",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Error en carregar el contingut del fitxer",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Fitxer eliminat correctament",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Fitxer guardat correctament",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Plegar tot",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Sortir sense guardar",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Carregant el contingut del fitxer...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Quedar-se",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Alternar comentari",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Plegar tot",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Desplegar tot",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message: "Canvis sense guardar",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message:
      "Teniu canvis sense guardar. Esteu segur que voleu sortir? Els canvis es perdran.",
    description: "Message shown for files that cannot be displayed",
  },
};

export default caFileEditor;
