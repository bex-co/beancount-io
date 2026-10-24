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
    "ledgerEditor.branchNotFound": {
      message:
        "شاخهٔ «{branch}» اینجا در دسترس نیست. فایل‌ها از {main} نمایش داده می‌شوند.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "مرور فایل‌ها در {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
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
    message: "کلون با Git",
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
  "ledgerEditor.notUtf8Text": {
    message:
      "این فایل متن UTF-8 نیست، بنابراین نمی‌توان آن را بدون تغییر بایت‌هایش اینجا نمایش داد یا ویرایش کرد. آن را بارگیری کنید تا در برنامهٔ دیگری باز شود.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
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
  "ledgerEditor.folderNamesChecking": {
    message: "در حال بررسی نام‌هایی که از قبل در این پوشه هستند…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "بررسی نام‌هایی که از قبل در این پوشه هستند ممکن نشد.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
