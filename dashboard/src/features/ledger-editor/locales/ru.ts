import ruDirectoryBrowse from "../directory-browse/locales/ru";
import ruFileEditor from "../file-editor/locales/ru";
import ruCreateFile from "../create-file/locales/ru";
import ruUploadFiles from "../upload-files/locales/ru";

const ruLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.newFileContentsLabel": {
      message: "Содержимое нового файла",
      description:
        "Accessible name of the new file editor before the file has a name",
    },
    "ledgerEditor.fileContentsLabel": {
      message: "Содержимое {path}",
      description:
        "Accessible name of the contents editor with the ledger-relative file path",
    },
    "ledgerEditor.createFile": {
      message: "Создать файл",
      description: "Button label to create file",
    },
    "ledgerEditor.branchNotFound": {
      message:
        "Ветка «{branch}» здесь недоступна. Файлы показываются из {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Открыть файлы в {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
    },
    "ledgerEditor.files": {
      message: "Файлы",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Загрузить файлы",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.portableFileName": {
      message:
        'Избегайте < > : " | ? *, имён вроде {con} или {nul}, частей, оканчивающихся точкой или пробелом, и частей длиннее 255 байт',
      description:
        "A new file name the server refuses because a Windows checkout cannot store it (w23/054)",
    },
    "ledgerEditor.fileIsNotFolder": {
      message: "{name} — файл, поэтому в нём не может быть других файлов",
      description:
        "A new path whose folder part is an existing file; {name} is that file",
    },
    "ledgerEditor.removeNonPortableFiles": {
      message:
        "Чтобы загрузить, уберите файлы с именами, которые Windows не может сохранить",
      description:
        "Explains why Upload Files is disabled while a staged file has a name Windows cannot store",
    },
    "ledgerEditor.fileExistsAs": {
      message: "Уже есть в этой папке под именем {name}",
      description:
        "A new file or upload whose name differs from an existing one only by letter case, Unicode form or an invisible character; {name} is the existing spelling",
    },
  };

export default {
  ...ruDirectoryBrowse,
  ...ruFileEditor,
  ...ruCreateFile,
  ...ruUploadFiles,
  ...ruLedgerEditor,
  "ledgerEditor.addFileInclude": {
    message: "Добавить в {main}, чтобы записи учитывались",
    description: "Label for including a new file from the entry point",
  },
  "ledgerEditor.fileNotLoaded": {
    message:
      "Ни один загруженный файл не включает {path}. Записи из него не учитываются и не были проверены.",
    description: "Warning after saving a ledger file outside the loaded files",
  },
  "ledgerEditor.addIncludeFailed": {
    message:
      "Файл {path} создан, но добавить его в {main} не удалось. Записи из него будут учитываться после подключения файла.",
    description:
      "Warning after creating a file when the separate entry point update fails",
  },
  "ledgerEditor.gitClone": {
    message: "Клон Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Не удалось загрузить содержимое каталога.",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Содержимое файла пусто",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Невозможно отобразить содержимое изображения",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Этот тип файла ({type}) не поддерживается для предварительного просмотра.",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Этот тип файла не поддерживается для предварительного просмотра.",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.notUtf8Text": {
    message:
      "Этот файл не является текстом в UTF-8, поэтому его нельзя показать или изменить здесь, не изменив его байты. Скачайте его, чтобы открыть в другой программе.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
  },
  "ledgerEditor.createFileCommit": {
    message: "Создать файл {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Файл обновления {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Удалить файл {path}",
    description: "Generated commit message for deleting a file",
  },
  "ledgerEditor.folderNamesChecking": {
    message: "Проверяем имена, которые уже есть в этой папке…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "Не удалось проверить имена, которые уже есть в этой папке.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
