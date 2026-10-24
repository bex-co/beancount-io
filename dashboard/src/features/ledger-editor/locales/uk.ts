import ukDirectoryBrowse from "../directory-browse/locales/uk";
import ukFileEditor from "../file-editor/locales/uk";
import ukCreateFile from "../create-file/locales/uk";
import ukUploadFiles from "../upload-files/locales/uk";

const ukLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Створити файл",
      description: "Button label to create file",
    },
    "ledgerEditor.branchNotFound": {
      message: "Гілка «{branch}» тут недоступна. Файли показано з {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Переглянути файли в {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
    },
    "ledgerEditor.files": {
      message: "Файли",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Завантажити файли",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...ukDirectoryBrowse,
  ...ukFileEditor,
  ...ukCreateFile,
  ...ukUploadFiles,
  ...ukLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Клонування Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Не вдалося завантажити вміст каталогу",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Вміст файлу порожній",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Неможливо відобразити вміст зображення",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Цей тип файлу ({type}) не підтримується для попереднього перегляду",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Цей тип файлу не підтримується для попереднього перегляду",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.notUtf8Text": {
    message:
      "Цей файл не є текстом у UTF-8, тому його не можна показати чи змінити тут, не змінивши його байти. Завантажте його, щоб відкрити в іншій програмі.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
  },
  "ledgerEditor.createFileCommit": {
    message: "Створити файл {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Оновити файл {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Видалити файл {path}",
    description: "Generated commit message for deleting a file",
  },
  "ledgerEditor.folderNamesChecking": {
    message: "Перевіряємо назви, які вже є в цій теці…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "Не вдалося перевірити назви, які вже є в цій теці.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
