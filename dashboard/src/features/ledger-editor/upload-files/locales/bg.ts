const bgUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "Добавяне на файлове чрез качване",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "Изберете файлове",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "Коментар за качване (по избор)",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "Плъзнете файлове тук, за да ги добавите към вашето хранилище",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "Надхвърля лимита от 1MB",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "Неуспешно качване на файлове",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "Максимален размер на файл: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "или",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "Избрани файлове ({count})",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "Качване...",
      description: "Message shown during file upload",
    },
  };

export default bgUploadFiles;
