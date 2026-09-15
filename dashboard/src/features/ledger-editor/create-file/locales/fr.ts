const frCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Nommez votre fichier...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Saisissez un chemin de fichier valide sans segments . ou ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Un fichier portant ce nom existe déjà",
    description: "Validation error when create-file name collides",
  },
};

export default frCreateFile;
