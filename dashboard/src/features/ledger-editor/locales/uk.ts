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
    "ledgerEditor.createNewFile": {
      message: "Створити новий файл",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Видалити file",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Вownload file",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Редагувати file",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Редагуватиor",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Не вдалося завантажити вміст директорії",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Не вдалося зберегти файл",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Файлs",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Клонувати Git",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Повернутися назад",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Корінь",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Оновити файли",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Завантажити файли",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Завантажити {count} файл",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...ukDirectoryBrowse,
  ...ukFileEditor,
  ...ukCreateFile,
  ...ukUploadFiles,
  ...ukLedgerEditor,
};
