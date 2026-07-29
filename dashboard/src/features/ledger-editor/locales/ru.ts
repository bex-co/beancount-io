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
    "ledgerEditor.createNewFile": {
      message: "Создать новый файл",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Удалить файл",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Скачать файл",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Редактировать файл",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Редактор",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Не удалось загрузить содержимое каталога",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Не удалось сохранить файл",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Файлы",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git Clone",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Назад",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Корень",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Обновить файлы",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Загрузить файлы",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Загрузить {count} файл",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...ruDirectoryBrowse,
  ...ruFileEditor,
  ...ruCreateFile,
  ...ruUploadFiles,
  ...ruLedgerEditor,
};
