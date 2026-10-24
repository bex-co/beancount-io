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
    "ledgerEditor.branchNotFound": {
      message:
        "La rama «{branch}» no está disponible aquí. Los archivos se muestran desde {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Explorar archivos en {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
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
  "ledgerEditor.notUtf8Text": {
    message:
      "Este archivo no es texto UTF-8, así que no se puede mostrar ni editar aquí sin cambiar sus bytes. Descárgalo para abrirlo en otro programa.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
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
  "ledgerEditor.folderNamesChecking": {
    message: "Comprobando los nombres que ya hay en esta carpeta…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "No se pudieron comprobar los nombres que ya hay en esta carpeta.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
