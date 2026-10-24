import bgDirectoryBrowse from "../directory-browse/locales/bg";
import bgFileEditor from "../file-editor/locales/bg";
import bgCreateFile from "../create-file/locales/bg";
import bgUploadFiles from "../upload-files/locales/bg";

const bgLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Създаване на файл",
      description: "Button label to create file",
    },
    "ledgerEditor.branchNotFound": {
      message:
        "Клонът „{branch}“ не е наличен тук. Файловете се показват от {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Разгледайте файловете в {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
    },
    "ledgerEditor.files": {
      message: "Файлове",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Качване на файлове",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...bgDirectoryBrowse,
  ...bgFileEditor,
  ...bgCreateFile,
  ...bgUploadFiles,
  ...bgLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Клониране с Git",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Неуспешно зареждане на съдържанието на директорията",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Съдържанието на файла е празно",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Не може да се покаже съдържанието на изображението",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "Този тип файл ({type}) не се поддържа за визуализация",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Този тип файл не се поддържа за преглед",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.notUtf8Text": {
    message:
      "Този файл не е текст в UTF-8, затова не може да се покаже или редактира тук, без да се променят байтовете му. Изтеглете го, за да го отворите в друга програма.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
  },
  "ledgerEditor.createFileCommit": {
    message: "Създаване на файл {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Актуализиране на файл {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Изтриване на файл {path}",
    description: "Generated commit message for deleting a file",
  },
  "ledgerEditor.folderNamesChecking": {
    message: "Проверка на имената, които вече са в тази папка…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message:
      "Имената, които вече са в тази папка, не можаха да бъдат проверени.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
