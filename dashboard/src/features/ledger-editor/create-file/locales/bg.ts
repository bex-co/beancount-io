const bgCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Име на файла...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Въведете валиден път без сегменти . или ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Файл с това име вече съществува",
    description: "Validation error when create-file name collides",
  },
};

export default bgCreateFile;
