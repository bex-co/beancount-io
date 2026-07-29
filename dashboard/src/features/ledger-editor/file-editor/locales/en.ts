const enFileEditor: Record<string, { message: string; description: string }> = {
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
  "ledgerEditor.failedToDeleteFile": {
    message: "Failed to delete file",
    description: "Error message when file deletion fails",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Failed to load file content",
    description: "Error message when file content fails to load",
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
