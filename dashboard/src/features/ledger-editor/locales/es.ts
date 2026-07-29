import esDirectoryBrowse from "../directory-browse/locales/es";
import esFileEditor from "../file-editor/locales/es";
import esCreateFile from "../create-file/locales/es";
import esUploadFiles from "../upload-files/locales/es";

const esLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Crear Archivo",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "Crear nuevo archivo",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Eliminar file",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Descargar archivo",
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
      message: "Error al cargar el contenido del directorio",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Error al guardar archivo",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Archivos",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Clonar Git",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Volver",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Raíz",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Actualizar Archivos",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Cargar archivos",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Cargar {count} archivo",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...esDirectoryBrowse,
  ...esFileEditor,
  ...esCreateFile,
  ...esUploadFiles,
  ...esLedgerEditor,
};
