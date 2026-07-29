const esUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "Agregar archivos mediante carga",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "Elegir archivos",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "Comentario de carga (opcional)",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "Arrastre archivos aquí para agregarlos a su repositorio",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "Excede el límite de 1MB",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "Error al cargar archivos",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "Tamaño máximo de archivo: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "o",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "Archivos seleccionados ({count})",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "Cargando...",
      description: "Message shown during file upload",
    },
  };

export default esUploadFiles;
