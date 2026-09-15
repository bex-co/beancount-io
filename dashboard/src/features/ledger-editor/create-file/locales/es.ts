const esCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Nombre your file...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Introduce una ruta de archivo válida sin segmentos . o ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Ya existe un archivo con este nombre",
    description: "Validation error when create-file name collides",
  },
};

export default esCreateFile;
