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
    "ledgerEditor.files": {
      message: "文件",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "上传文件",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...zhDirectoryBrowse,
  ...zhFileEditor,
  ...zhCreateFile,
  ...zhUploadFiles,
  ...zhLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Git 克隆",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "加载目录内容失败",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "文件内容为空",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "无法显示图像内容",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "预览不支持此文件类型 ({type})",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "该文件类型不支持预览",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "创建文件 {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "更新文件 {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "删除文件 {path}",
    description: "Generated commit message for deleting a file",
  },
};
