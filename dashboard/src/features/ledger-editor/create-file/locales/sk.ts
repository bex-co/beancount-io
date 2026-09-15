const skCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Pomenujte váš súbor...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Zadajte platnú cestu k súboru bez segmentov . alebo ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Súbor s týmto názvom už existuje",
    description: "Validation error when create-file name collides",
  },
};

export default skCreateFile;
