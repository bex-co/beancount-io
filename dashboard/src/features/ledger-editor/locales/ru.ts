import ruDirectoryBrowse from "../directory-browse/locales/ru";
import ruFileEditor from "../file-editor/locales/ru";
import ruCreateFile from "../create-file/locales/ru";
import ruUploadFiles from "../upload-files/locales/ru";

const ruLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Создать файл",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Файлы",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Загрузить файлы",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...ruDirectoryBrowse,
  ...ruFileEditor,
  ...ruCreateFile,
  ...ruUploadFiles,
  ...ruLedgerEditor,
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
};
