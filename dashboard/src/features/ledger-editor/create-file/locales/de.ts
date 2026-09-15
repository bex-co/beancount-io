const deCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Name your file...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Geben Sie einen gültigen Dateipfad ohne . oder .. Segmente ein",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Eine Datei mit diesem Namen existiert bereits",
    description: "Validation error when create-file name collides",
  },
};

export default deCreateFile;
