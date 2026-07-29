const jaUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "アップロードでファイルを追加",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "ファイルを選択",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "アップロードコメント（任意）",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "ファイルをここにドラッグしてリポジトリに追加",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "1MBの制限を超えています",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "ファイルのアップロードに失敗しました",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "最大ファイルサイズ: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "または",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "選択したファイル（{count}）",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "アップロード中...",
      description: "Message shown during file upload",
    },
  };

export default jaUploadFiles;
