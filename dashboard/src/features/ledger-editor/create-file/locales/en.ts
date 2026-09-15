const enCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Name your file...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Enter a valid file path without . or .. segments",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "A file with this name already exists",
    description: "Validation error when create-file name collides",
  },
};

export default enCreateFile;
