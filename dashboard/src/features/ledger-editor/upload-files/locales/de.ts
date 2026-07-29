const deUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "Dateien über Upload hinzufügen",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "Dateien auswählen",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "Upload-Kommentar (optional)",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message:
        "Dateien hierher ziehen, um sie zu Ihrem Repository hinzuzufügen",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "Überschreitet 1MB-Limit",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "Dateien konnten nicht hochgeladen werden",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "Maximale Dateigröße: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "oder",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "Ausgewählte Dateien ({count})",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "Wird hochgeladen...",
      description: "Message shown during file upload",
    },
  };

export default deUploadFiles;
