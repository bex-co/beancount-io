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
    message: "Git Clone",
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
};
