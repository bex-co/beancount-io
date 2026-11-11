const ptFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message: "{filename} é o arquivo raiz do livro e não pode ser excluído",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message:
      "Não foi possível preparar {filename} para download. Tente novamente.",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
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
    message: "Excluir arquivo",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.deleteFileIncluded": {
    message:
      "O arquivo “{filename}” é incluído por {includers}. Remover a inclusão e excluir o arquivo? Esta ação não pode ser desfeita.",
    description:
      "Confirmation shown when a file other ledger files still include is deleted; {filename} is the file, {includers} the files that include it",
  },
  "ledgerEditor.deleteFileRemoveInclude": {
    message: "Remover inclusão e excluir",
    description:
      "Button that deletes a file and also removes the include lines that point at it",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Falha ao carregar conteúdo do arquivo",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "Arquivo não encontrado: {path}",
    description:
      "Mensagem quando um caminho de arquivo do razão não existe (contém {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Abrir diretório pai",
    description:
      "Botão para abrir o diretório Files pai após um arquivo ausente",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Arquivo excluído com sucesso",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Arquivo salvo com sucesso",
    description: "Success message when file is saved",
  },
  "ledgerEditor.saveConflict": {
    message:
      "Este arquivo mudou desde que você o abriu, então sua edição não foi salva. Copie sua edição, carregue a versão mais recente e aplique-a nela.",
    description:
      "Inline notice when a file save was refused because another write changed the file since it was opened",
  },
  "ledgerEditor.copyMyEdit": {
    message: "Copiar minha edição",
    description:
      "Copies the unsaved file edit to the clipboard after a conflicting save",
  },
  "ledgerEditor.loadLatest": {
    message: "Carregar a mais recente",
    description:
      "Opens a confirmation to replace the unsaved edit with the file's latest revision",
  },
  "ledgerEditor.loadLatestTitle": {
    message: "Substituir sua edição pela versão mais recente?",
    description:
      "Title of the confirmation before replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.loadLatestDescription": {
    message:
      "O editor mostrará o arquivo como está agora. Sua edição não salva será perdida, a menos que você a tenha copiado.",
    description:
      "Explains that loading the latest revision replaces the unsaved edit",
  },
  "ledgerEditor.loadLatestConfirm": {
    message: "Substituir minha edição",
    description: "Confirms replacing the unsaved edit with the latest revision",
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
