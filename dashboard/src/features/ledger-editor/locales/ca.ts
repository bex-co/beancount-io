import caDirectoryBrowse from "../directory-browse/locales/ca";
import caFileEditor from "../file-editor/locales/ca";
import caCreateFile from "../create-file/locales/ca";
import caUploadFiles from "../upload-files/locales/ca";

const caLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Crear fitxer",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "Crear un fitxer nou",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Eliminar fitxer",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Descarregar fitxer",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Editar fitxer",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Editor",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Error en carregar el contingut del directori",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Error en guardar el fitxer",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Fitxers",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Clonar Git",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Tornar enrere",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Arrel",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Format de fitxer no admès",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Actualitzar fitxers",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Pujar {count} fitxer",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...caDirectoryBrowse,
  ...caFileEditor,
  ...caCreateFile,
  ...caUploadFiles,
  ...caLedgerEditor,
};
