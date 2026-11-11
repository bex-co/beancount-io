const frFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message:
      "{filename} est le fichier racine du grand livre et ne peut pas être supprimé",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message:
      "Impossible de préparer {filename} pour le téléchargement. Veuillez réessayer.",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
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
  "ledgerEditor.deleteFileIncluded": {
    message:
      "Le fichier « {filename} » est inclus par {includers}. Retirer l’inclusion et supprimer le fichier ? Cette action est irréversible.",
    description:
      "Confirmation shown when a file other ledger files still include is deleted; {filename} is the file, {includers} the files that include it",
  },
  "ledgerEditor.deleteFileRemoveInclude": {
    message: "Retirer l’inclusion et supprimer",
    description:
      "Button that deletes a file and also removes the include lines that point at it",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Échec du chargement du contenu du fichier",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "Fichier introuvable : {path}",
    description:
      "Message lorsqu'un chemin de fichier du grand livre n'existe pas (contient {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Parcourir le dossier parent",
    description:
      "Bouton pour ouvrir le dossier Files parent après un fichier manquant",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Fichier supprimé avec succès",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Fichier enregistré avec succès",
    description: "Success message when file is saved",
  },
  "ledgerEditor.saveConflict": {
    message:
      "Ce fichier a changé depuis que vous l’avez ouvert : votre modification n’a donc pas été enregistrée. Copiez-la, puis chargez la dernière version et appliquez-la dessus.",
    description:
      "Inline notice when a file save was refused because another write changed the file since it was opened",
  },
  "ledgerEditor.copyMyEdit": {
    message: "Copier ma modification",
    description:
      "Copies the unsaved file edit to the clipboard after a conflicting save",
  },
  "ledgerEditor.loadLatest": {
    message: "Charger la dernière version",
    description:
      "Opens a confirmation to replace the unsaved edit with the file's latest revision",
  },
  "ledgerEditor.loadLatestTitle": {
    message: "Remplacer votre modification par la dernière version ?",
    description:
      "Title of the confirmation before replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.loadLatestDescription": {
    message:
      "L’éditeur affichera le fichier tel qu’il est maintenant. Votre modification non enregistrée sera perdue si vous ne l’avez pas copiée.",
    description:
      "Explains that loading the latest revision replaces the unsaved edit",
  },
  "ledgerEditor.loadLatestConfirm": {
    message: "Remplacer ma modification",
    description: "Confirms replacing the unsaved edit with the latest revision",
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
