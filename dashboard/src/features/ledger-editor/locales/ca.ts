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
    "ledgerEditor.branchNotFound": {
      message:
        "La branca «{branch}» no està disponible aquí. Els fitxers es mostren des de {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Explora els fitxers de {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
    },
    "ledgerEditor.files": {
      message: "Fitxers",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Actualitzar fitxers",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.portableFileName": {
      message:
        'Eviteu < > : " | ? *, noms com {con} o {nul}, una part acabada en punt o espai i parts de més de 255 bytes',
      description:
        "A new file name the server refuses because a Windows checkout cannot store it (w23/054)",
    },
    "ledgerEditor.fileIsNotFolder": {
      message: "{name} és un fitxer, així que no pot contenir altres fitxers",
      description:
        "A new path whose folder part is an existing file; {name} is that file",
    },
    "ledgerEditor.removeNonPortableFiles": {
      message:
        "Traieu els fitxers amb noms que Windows no pot desar per pujar-los",
      description:
        "Explains why Upload Files is disabled while a staged file has a name Windows cannot store",
    },
    "ledgerEditor.fileExistsAs": {
      message: "Ja existeix en aquesta carpeta com a {name}",
      description:
        "A new file or upload whose name differs from an existing one only by letter case, Unicode form or an invisible character; {name} is the existing spelling",
    },
  };

export default {
  ...caDirectoryBrowse,
  ...caFileEditor,
  ...caCreateFile,
  ...caUploadFiles,
  ...caLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Clona amb Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "No s'ha pogut carregar el contingut del directori",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "El contingut del fitxer és buit",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "No es pot mostrar el contingut de la imatge",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Aquest tipus de fitxer ({type}) no és compatible per a la previsualització",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message:
      "Aquest tipus de fitxer no és compatible per a la previsualització",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.notUtf8Text": {
    message:
      "Aquest fitxer no és text UTF-8, així que no es pot mostrar ni editar aquí sense canviar-ne els bytes. Baixeu-lo per obrir-lo en un altre programa.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
  },
  "ledgerEditor.createFileCommit": {
    message: "Crea un fitxer {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Actualitza el fitxer {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Suprimeix el fitxer {path}",
    description: "Generated commit message for deleting a file",
  },
  "ledgerEditor.folderNamesChecking": {
    message: "S'estan comprovant els noms que ja hi ha en aquesta carpeta…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message:
      "No s'han pogut comprovar els noms que ja hi ha en aquesta carpeta.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
