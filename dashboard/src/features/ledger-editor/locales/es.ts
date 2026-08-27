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
    "ledgerEditor.files": {
      message: "Archivos",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Cargar archivos",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...esDirectoryBrowse,
  ...esFileEditor,
  ...esCreateFile,
  ...esUploadFiles,
  ...esLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Clon de Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "No se pudo cargar el contenido del directorio",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "El contenido del archivo está vacío.",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "No se puede mostrar el contenido de la imagen",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Este tipo de archivo ({type}) no es compatible con la vista previa",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Este tipo de archivo no es compatible con la vista previa",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "Crear archivo {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Actualizar archivo {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Eliminar archivo {path}",
    description: "Generated commit message for deleting a file",
  },
};
