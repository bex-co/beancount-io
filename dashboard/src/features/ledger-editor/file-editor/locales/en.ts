const enFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message: "{filename} is the ledger's root file and can't be deleted",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message: "Could not prepare {filename} for download. Please try again.",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
  "ledgerEditor.alignAmounts": {
    message: "Align Amounts",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Are you sure you want to delete "{filename}"? This action cannot be undone.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Delete File",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Failed to load file content",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "File not found: {path}",
    description:
      "Message when a ledger file path does not exist (contains {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Browse parent directory",
    description:
      "Button to open the parent Files directory after a missing file",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "File deleted successfully",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "File saved successfully",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Fold All",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Leave Without Saving",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Loading file content...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Stay",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Toggle Comment",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Unfold All",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Unsaved Changes",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Unsupported file format",
    description: "Message shown for files that cannot be displayed",
  },
};

export default enFileEditor;
