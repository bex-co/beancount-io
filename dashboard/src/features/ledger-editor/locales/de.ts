import deDirectoryBrowse from "../directory-browse/locales/de";
import deFileEditor from "../file-editor/locales/de";
import deCreateFile from "../create-file/locales/de";
import deUploadFiles from "../upload-files/locales/de";

const deLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Datei erstellen",
      description: "Button label to create file",
    },
    "ledgerEditor.branchNotFound": {
      message:
        "Der Branch „{branch}“ ist hier nicht verfügbar. Dateien werden aus {main} angezeigt.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Dateien in {main} durchsuchen",
      description:
        "Link to the Files root on the supported branch (contains {main})",
    },
    "ledgerEditor.files": {
      message: "Dateien",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Dateien hochladen",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.portableFileName": {
      message:
        'Vermeiden Sie < > : " | ? *, Namen wie {con} oder {nul}, Teile, die auf einen Punkt oder ein Leerzeichen enden, und Teile über 255 Byte',
      description:
        "A new file name the server refuses because a Windows checkout cannot store it (w23/054)",
    },
    "ledgerEditor.fileIsNotFolder": {
      message: "{name} ist eine Datei und kann keine anderen Dateien enthalten",
      description:
        "A new path whose folder part is an existing file; {name} is that file",
    },
    "ledgerEditor.removeNonPortableFiles": {
      message:
        "Entfernen Sie Dateien, deren Namen Windows nicht speichern kann, um hochzuladen",
      description:
        "Explains why Upload Files is disabled while a staged file has a name Windows cannot store",
    },
    "ledgerEditor.fileExistsAs": {
      message: "Existiert in diesem Ordner bereits als {name}",
      description:
        "A new file or upload whose name differs from an existing one only by letter case, Unicode form or an invisible character; {name} is the existing spelling",
    },
  };

export default {
  ...deDirectoryBrowse,
  ...deFileEditor,
  ...deCreateFile,
  ...deUploadFiles,
  ...deLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Git-Klon",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Verzeichnisinhalt konnte nicht geladen werden",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Dateiinhalt ist leer",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Bildinhalt kann nicht angezeigt werden",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "Dieser Dateityp ({type}) wird für die Vorschau nicht unterstützt",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Dieser Dateityp wird für die Vorschau nicht unterstützt",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.notUtf8Text": {
    message:
      "Diese Datei ist kein UTF-8-Text und kann hier nicht angezeigt oder bearbeitet werden, ohne ihre Bytes zu ändern. Laden Sie sie herunter, um sie anderswo zu öffnen.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
  },
  "ledgerEditor.createFileCommit": {
    message: "Datei erstellen {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Datei aktualisieren {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Datei löschen {path}",
    description: "Generated commit message for deleting a file",
  },
  "ledgerEditor.folderNamesChecking": {
    message: "Namen in diesem Ordner werden geprüft …",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "Die Namen in diesem Ordner konnten nicht geprüft werden.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
