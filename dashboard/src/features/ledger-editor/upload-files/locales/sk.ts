const skUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "Pridať súbory cez nahratie",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "Vybrať súbory",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "Komentár k nahraniu (voliteľné)",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "Presuňte súbory sem, aby ste ich pridali do vášho repozitára",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "Prekračuje limit 1MB",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "Nahranie súborov zlyhalo",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "Maximálna veľkosť súboru: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "alebo",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "Vybrané súbory ({count})",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "Nahrávam...",
      description: "Message shown during file upload",
    },
  };

export default skUploadFiles;
