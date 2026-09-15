const ruCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Имя вашего файла...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Введите допустимый путь без сегментов . или ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Файл с таким именем уже существует",
    description: "Validation error when create-file name collides",
  },
};

export default ruCreateFile;
