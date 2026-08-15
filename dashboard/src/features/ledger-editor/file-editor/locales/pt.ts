const ptFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Alinhar Valores",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Tem certeza de que deseja excluir "{filename}"? Esta ação não pode ser desfeita.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Excluir File",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Falha ao carregar conteúdo do arquivo",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Arquivo excluído com sucesso",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Arquivo salvo com sucesso",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Recolher Tudo",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Sair Sem Salvar",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Carregando conteúdo do arquivo...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Ficar",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Alternar Comentário",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Expandir Tudo",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Alterações Não Salvas",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "Você tem alterações não salvas. Tem certeza de que deseja sair? Suas alterações serão perdidas.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Formato de arquivo não suportado",
    description: "Message shown for files that cannot be displayed",
  },
};

export default ptFileEditor;
