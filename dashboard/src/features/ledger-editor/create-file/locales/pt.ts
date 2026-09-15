const ptCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "Nomeie seu arquivo...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "Digite um caminho de arquivo válido sem segmentos . ou ..",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "Já existe um arquivo com este nome",
    description: "Validation error when create-file name collides",
  },
};

export default ptCreateFile;
