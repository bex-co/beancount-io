const nlCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Naam your file...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Voer een geldig bestandspad in zonder . of .. segmenten",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Er bestaat al een bestand met deze naam",
    description: "Validation error when create-file name collides",
  },
};

export default nlCreateFile;
