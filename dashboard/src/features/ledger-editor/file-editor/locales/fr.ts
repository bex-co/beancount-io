const frFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Aligner les montants",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Êtes-vous sûr de vouloir supprimer "{filename}" ? Cette action ne peut pas être annulée.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Supprimer le fichier",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Échec du chargement du contenu du fichier",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Fichier supprimé avec succès",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Fichier enregistré avec succès",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Replier tout",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Quitter sans enregistrer",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Chargement du contenu du fichier...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Rester",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Basculer le commentaire",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Déplier tout",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Modifications non enregistrées",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter ? Vos modifications seront perdues.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Format de fichier non pris en charge",
    description: "Message shown for files that cannot be displayed",
  },
};

export default frFileEditor;
