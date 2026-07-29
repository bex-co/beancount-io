const caUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "Afegir fitxers mitjançant pujada",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "Trieu els fitxers",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "Comentari de pujada (opcional)",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "Arrossegueu fitxers aquí per afegir-los al vostre repositori",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "Supera el límit de 1MB",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "Error en pujar els fitxers",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "Mida màxima del fitxer: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "o",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "Fitxers seleccionats ({count})",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "Pujant...",
      description: "Message shown during file upload",
    },
  };

export default caUploadFiles;
