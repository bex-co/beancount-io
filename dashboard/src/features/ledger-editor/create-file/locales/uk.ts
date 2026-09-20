const ukCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Назвіть свій файл...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Введіть дійсний шлях без сегментів . або ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Файл із такою назвою вже існує",
    description: "Validation error when create-file name collides",
  },
};

export default ukCreateFile;
