import zhDirectoryBrowse from "../directory-browse/locales/zh";
import zhFileEditor from "../file-editor/locales/zh";
import zhCreateFile from "../create-file/locales/zh";
import zhUploadFiles from "../upload-files/locales/zh";

const zhLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "创建文件",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "创建新文件",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "删除文件",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "下载文件",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "编辑文件",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "编辑器",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "加载目录内容失败",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "保存文件失败",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "文件",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git 克隆",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "返回",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "根目录",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "更新文件",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "上传文件",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "上传 {count} 个文件",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...zhDirectoryBrowse,
  ...zhFileEditor,
  ...zhCreateFile,
  ...zhUploadFiles,
  ...zhLedgerEditor,
};
