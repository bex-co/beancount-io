const zhUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "通过上传添加文件",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "选择文件",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "上传备注（可选）",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "将文件拖放到此处以添加到你的仓库",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "超过 1MB 限制",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "上传文件失败",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "最大文件大小：1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "或",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "已选文件 ({count})",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "上传中...",
      description: "Message shown during file upload",
    },
  };

export default zhUploadFiles;
