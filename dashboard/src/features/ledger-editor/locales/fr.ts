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
    "ledgerEditor.createNewFile": {
      message: "Créer un nouveau fichier",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Supprimer le fichier",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Télécharger le fichier",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Modifier le fichier",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Éditeur",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Échec du chargement du contenu du répertoire",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Échec de l'enregistrement du fichier",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Fichiers",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Cloner Git",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Retour",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Racine",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Mettre à jour les fichiers",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Téléverser des fichiers",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Téléverser {count} fichier",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...frDirectoryBrowse,
  ...frFileEditor,
  ...frCreateFile,
  ...frUploadFiles,
  ...frLedgerEditor,
};
