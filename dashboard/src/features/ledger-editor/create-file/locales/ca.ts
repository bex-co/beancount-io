const caCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Nom del fitxer...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Introduïu un camí de fitxer vàlid sense segments . o ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Ja existeix un fitxer amb aquest nom",
    description: "Validation error when create-file name collides",
  },
};

export default caCreateFile;
