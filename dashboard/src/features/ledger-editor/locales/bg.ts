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
    "ledgerEditor.createNewFile": {
      message: "Създаване на нов файл",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Изтриване на файл",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Изтегляне на файл",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Редактиране на файл",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Редактор",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Неуспешно зареждане на съдържанието на директорията",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Неуспешно запазване на файл",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Файлове",
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
      message: "Корен",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Актуализиране на файлове",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Качване на файлове",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Качване на {count} файл",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...bgDirectoryBrowse,
  ...bgFileEditor,
  ...bgCreateFile,
  ...bgUploadFiles,
  ...bgLedgerEditor,
};
