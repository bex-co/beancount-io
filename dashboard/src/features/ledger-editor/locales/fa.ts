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
    "ledgerEditor.files": {
      message: "فایل‌ها",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "بارگذاری فایل‌ها",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...faDirectoryBrowse,
  ...faFileEditor,
  ...faCreateFile,
  ...faUploadFiles,
  ...faLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Git Clone",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "محتویات دایرکتوری بارگیری نشد",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "محتوای فایل خالی است",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "امکان نمایش محتوای تصویر وجود ندارد",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "این نوع فایل ({type}) برای پیش نمایش پشتیبانی نمی شود",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "این نوع فایل برای پیش نمایش پشتیبانی نمی شود",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "ایجاد فایل {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "به روز رسانی فایل {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "حذف فایل {path}",
    description: "Generated commit message for deleting a file",
  },
};
