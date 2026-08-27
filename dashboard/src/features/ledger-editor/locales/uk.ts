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
    "ledgerEditor.files": {
      message: "Файлs",
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
    message: "Git Clone",
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
};
