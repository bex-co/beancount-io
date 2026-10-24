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
    "ledgerEditor.branchNotFound": {
      message:
        "La branche « {branch} » n'est pas disponible ici. Les fichiers sont affichés depuis {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Parcourir les fichiers de {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
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
  "ledgerEditor.notUtf8Text": {
    message:
      "Ce fichier n'est pas du texte UTF-8 : il ne peut pas être affiché ni modifié ici sans changer ses octets. Téléchargez-le pour l'ouvrir ailleurs.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
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
  "ledgerEditor.folderNamesChecking": {
    message: "Vérification des noms déjà présents dans ce dossier…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "Impossible de vérifier les noms déjà présents dans ce dossier.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
