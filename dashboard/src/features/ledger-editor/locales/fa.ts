import faDirectoryBrowse from "../directory-browse/locales/fa";
import faFileEditor from "../file-editor/locales/fa";
import faCreateFile from "../create-file/locales/fa";
import faUploadFiles from "../upload-files/locales/fa";

const faLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "ایجاد فایل",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "ایجاد فایل جدید",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "حذف فایل",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "دانلود فایل",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "ویرایش فایل",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "ویرایشگر",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "بارگذاری محتویات پوشه ناموفق بود",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "ذخیره فایل ناموفق بود",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "فایل‌ها",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "کپی Git",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "بازگشت",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "ریشه",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "به‌روزرسانی فایل‌ها",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "بارگذاری فایل‌ها",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "بارگذاری {count} فایل",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...faDirectoryBrowse,
  ...faFileEditor,
  ...faCreateFile,
  ...faUploadFiles,
  ...faLedgerEditor,
};
