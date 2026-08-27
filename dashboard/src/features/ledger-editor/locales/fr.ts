import frDirectoryBrowse from "../directory-browse/locales/fr";
import frFileEditor from "../file-editor/locales/fr";
import frCreateFile from "../create-file/locales/fr";
import frUploadFiles from "../upload-files/locales/fr";

const frLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Créer un fichier",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Fichiers",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Téléverser des fichiers",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...frDirectoryBrowse,
  ...frFileEditor,
  ...frCreateFile,
  ...frUploadFiles,
  ...frLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Cloner Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Échec du chargement du contenu du répertoire",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Le contenu du fichier est vide",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Impossible d'afficher le contenu de l'image",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Ce type de fichier ({type}) n'est pas pris en charge pour l'aperçu",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Ce type de fichier n'est pas pris en charge pour l'aperçu",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "Créer le fichier {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Mettre à jour le fichier {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Supprimer le fichier {path}",
    description: "Generated commit message for deleting a file",
  },
};
