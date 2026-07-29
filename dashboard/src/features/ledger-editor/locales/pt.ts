import ptDirectoryBrowse from "../directory-browse/locales/pt";
import ptFileEditor from "../file-editor/locales/pt";
import ptCreateFile from "../create-file/locales/pt";
import ptUploadFiles from "../upload-files/locales/pt";

const ptLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Criar Arquivo",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "Criar novo arquivo",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Excluir file",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Baixar arquivo",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Editar file",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Editaror",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Falha ao carregar conteúdo do diretório",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Falha ao salvar arquivo",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Arquivos",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git Clone",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Voltar",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Raiz",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Atualizar Arquivos",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Enviar arquivos",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Enviar {count} arquivo",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...ptDirectoryBrowse,
  ...ptFileEditor,
  ...ptCreateFile,
  ...ptUploadFiles,
  ...ptLedgerEditor,
};
