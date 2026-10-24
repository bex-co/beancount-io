import skDirectoryBrowse from "../directory-browse/locales/sk";
import skFileEditor from "../file-editor/locales/sk";
import skCreateFile from "../create-file/locales/sk";
import skUploadFiles from "../upload-files/locales/sk";

const skLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Vytvoriť súbor",
      description: "Button label to create file",
    },
    "ledgerEditor.branchNotFound": {
      message:
        "Vetva „{branch}“ tu nie je dostupná. Súbory sa zobrazujú z {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Prehliadať súbory v {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
    },
    "ledgerEditor.files": {
      message: "Súbory",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Nahrať súbory",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...skDirectoryBrowse,
  ...skFileEditor,
  ...skCreateFile,
  ...skUploadFiles,
  ...skLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Klonovať cez Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Nepodarilo sa načítať obsah adresára",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Obsah súboru je prázdny",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Nie je možné zobraziť obsah obrázka",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Tento typ súboru ({type}) nie je podporovaný na zobrazenie ukážky",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Tento typ súboru nie je podporovaný na ukážku",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.notUtf8Text": {
    message:
      "Tento súbor nie je text v UTF-8, preto ho tu nemožno zobraziť ani upraviť bez zmeny jeho bajtov. Stiahnite si ho a otvorte v inom programe.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
  },
  "ledgerEditor.createFileCommit": {
    message: "Vytvoriť súbor {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Aktualizovať súbor {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Odstrániť súbor {path}",
    description: "Generated commit message for deleting a file",
  },
  "ledgerEditor.folderNamesChecking": {
    message: "Kontrolujú sa názvy, ktoré už sú v tomto priečinku…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message:
      "Názvy, ktoré už sú v tomto priečinku, sa nepodarilo skontrolovať.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
